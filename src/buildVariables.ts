import {
  IntrospectionField,
  IntrospectionInputObjectType,
  IntrospectionInputValue,
  IntrospectionNamedTypeRef,
  IntrospectionNonNullTypeRef,
  IntrospectionType,
  TypeKind,
} from 'graphql';
import {
  GET_LIST,
  GET_ONE,
  GET_MANY,
  GET_MANY_REFERENCE,
  CREATE,
  UPDATE,
  DELETE,
  DELETE_MANY,
  UPDATE_MANY,
} from 'ra-core';
import { IntrospectionResult, IntrospectedResource } from 'ra-data-graphql';

import getFinalType from './getFinalType';
import isList from './isList';
import {
  MutationCreateOneArgs,
  MutationDeleteManyArgs,
  MutationDeleteOneArgs,
  MutationUpdateManyArgs,
  MutationUpdateOneArgs,
  QueryArgs,
} from './types';
import camelCase from 'lodash/camelCase';

export default (introspectionResults: IntrospectionResult) =>
  (
    resource: IntrospectedResource,
    raFetchMethod: string,
    params: any,
    queryType: IntrospectionField,
  ) => {
    const preparedParams = prepareParams(
      params,
      queryType,
      introspectionResults,
    );

    console.debug(`${raFetchMethod} preparedParams`, preparedParams);

    switch (raFetchMethod) {
      case GET_LIST:
        return getListVariables(resource, preparedParams);
      case GET_MANY:
        return {
          filter: { id: { in: preparedParams.ids } },
          paging: { limit: preparedParams.ids.length, offset: 0 },
          meta: preparedParams.meta,
        };
      case GET_MANY_REFERENCE:
        let variables = getListVariables(resource, preparedParams);
        Object.assign(variables.filter, {
          [preparedParams.target]: {
            id: Array.isArray(preparedParams.id)
              ? { in: preparedParams.id }
              : { eq: preparedParams.id },
          },
        });
        return variables;
      case GET_ONE:
        return {
          id: preparedParams.id,
          meta: preparedParams.meta,
        };
      case DELETE:
        return buildDeleteOneVariables(introspectionResults)(
          queryType,
          preparedParams,
        );
      case DELETE_MANY:
        return buildDeleteManyVariables(introspectionResults)(
          queryType,
          preparedParams,
        );
      case CREATE:
        return buildCreateVariables(introspectionResults)(
          resource,
          queryType,
          preparedParams,
        );
      case UPDATE:
        return buildUpdateVariables(introspectionResults)(
          queryType,
          preparedParams,
        );
      case UPDATE_MANY: {
        return buildUpdateManyVariables(introspectionResults)(
          queryType,
          preparedParams,
        );
      }
    }
  };

const sanitizeValue = (type: IntrospectionType, value: any) => {
  if (type.name === 'Int') {
    return parseInt(value, 10);
  }

  if (type.name === 'Float') {
    return parseFloat(value);
  }

  return value;
};

const castType = (
  value: any,
  type: IntrospectionType | IntrospectionNonNullTypeRef,
) => {
  const realType = type.kind === 'NON_NULL' ? type.ofType : type;
  switch (`${realType.kind}:${(realType as IntrospectionNamedTypeRef).name}`) {
    case 'SCALAR:Int':
      return Number(value);

    case 'SCALAR:String':
      return String(value);

    case 'SCALAR:Boolean':
      return Boolean(value);

    default:
      return value;
  }
};

const prepareParams = (
  params: any,
  queryType: Partial<IntrospectionField>,
  introspectionResults: IntrospectionResult,
) => {
  const result = {};

  if (!params) {
    return params;
  }

  Object.keys(params).forEach((key) => {
    const param = params[key];
    let arg = null;

    if (!param) {
      result[key] = param;
      return;
    }

    if (queryType && Array.isArray(queryType.args)) {
      arg = queryType.args.find((item) => item.name === key);
    }

    if (param instanceof File) {
      result[key] = param;
      return;
    }

    if (param instanceof Date) {
      result[key] = param.toISOString();
      return;
    }

    if (
      param instanceof Object &&
      !Array.isArray(param) &&
      arg?.type.kind === TypeKind.INPUT_OBJECT
    ) {
      const args = (
        introspectionResults.types.find(
          (item) => item.kind === arg.type.kind && item.name === arg.type.name,
        ) as IntrospectionInputObjectType
      ).inputFields;
      result[key] = prepareParams(param, { args }, introspectionResults);
      return;
    }

    if (
      param instanceof Object &&
      !(param instanceof Date) &&
      !Array.isArray(param)
    ) {
      result[key] = prepareParams(param, queryType, introspectionResults);
      return;
    }

    if (!arg) {
      result[key] = param;
      return;
    }

    result[key] = castType(param, arg.type);
  });

  return result;
};

const getListVariables = (
  resource: IntrospectedResource,
  params: any,
): QueryArgs => {
  let variables: QueryArgs = { filter: {} };
  if (params.filter) {
    variables.filter = Object.keys(params.filter).reduce((acc, key) => {
      if (key === 'ids') {
        return { ...acc, id: { in: params.filter[key] } };
      }

      const resourceField = resource.type.fields.find((f) => f.name === key);

      if (resourceField) {
        const type = getFinalType(resourceField.type);
        const isAList = isList(resourceField.type);

        if (isAList) {
          return {
            ...acc,
            [key]: Array.isArray(params.filter[key])
              ? params.filter[key].map((value) => sanitizeValue(type, value))
              : sanitizeValue(type, [params.filter[key]]),
          };
        }

        if (params.filter[key] && typeof params.filter[key] === 'object') {
          return {
            ...acc,
            [key]: params.filter[key],
          };
        }

        const operator =
          `${type.kind}:${type.name}` === 'SCALAR:String' ? 'iLike' : 'eq';

        return {
          ...acc,
          [key]: { [operator]: sanitizeValue(type, params.filter[key]) },
        };
      }

      return { ...acc, [key]: { eq: params.filter[key] } };
    }, {});
  }

  if (params.pagination) {
    const perPage = parseInt(params.pagination.perPage, 10);
    variables.paging = {
      limit: parseInt(params.pagination.perPage, 10),
      offset: (parseInt(params.pagination.page, 10) - 1) * perPage,
    };
  }

  if (params.sort) {
    variables.sorting = [
      { field: params.sort.field, direction: params.sort.order },
    ];
  }

  if (params.meta) {
    variables.meta = params.meta;
  }

  return variables;
};

const buildCreateVariables =
  (introspectionResult: IntrospectionResult) =>
  (
    resource: IntrospectedResource,
    queryType: IntrospectionField,
    { data }: any,
  ): MutationCreateOneArgs =>
    buildCleanObjectByQueryType(introspectionResult)(
      {
        input: {
          [camelCase(resource.type.name)]: data,
        },
      },
      queryType.args,
    );

const buildUpdateVariables =
  (introspectionResult: IntrospectionResult) =>
  (queryType: IntrospectionField, { id, data }: any): MutationUpdateOneArgs =>
    buildCleanObjectByQueryType(introspectionResult)(
      {
        input: {
          id,
          update: data,
        },
      },
      queryType.args,
    );

const buildUpdateManyVariables =
  (introspectionResult: IntrospectionResult) =>
  (queryType: IntrospectionField, { ids, data }: any): MutationUpdateManyArgs =>
    buildCleanObjectByQueryType(introspectionResult)(
      {
        input: {
          filter: {
            id: { in: ids },
          },
          update: data,
        },
      },
      queryType.args,
    );

const buildDeleteOneVariables =
  (introspectionResult: IntrospectionResult) =>
  (queryType: IntrospectionField, { id }: any): MutationDeleteOneArgs =>
    buildCleanObjectByQueryType(introspectionResult)(
      {
        input: {
          id,
        },
      },
      queryType.args,
    );

const buildDeleteManyVariables =
  (introspectionResult: IntrospectionResult) =>
  (queryType: IntrospectionField, { ids }: any): MutationDeleteManyArgs =>
    buildCleanObjectByQueryType(introspectionResult)(
      {
        input: {
          filter: {
            id: { in: ids },
          },
        },
      },
      queryType.args,
    );

const buildCleanObjectByQueryType =
  (introspectionResults: IntrospectionResult) =>
  <T>(obj: any, inputValues: readonly IntrospectionInputValue[]): T => {
    if (typeof obj !== 'object' || obj === null || obj === undefined) {
      return obj;
    }

    const inputValueMap = new Map(
      inputValues.map((inputValue) => [inputValue.name, inputValue]),
    );

    return Object.entries(obj).reduce((acum, [curKey, curValue]) => {
      const inputValue = inputValueMap.get(curKey);

      if (!inputValue) {
        console.debug('Field type not found, skipping', curKey);
        return acum;
      }

      const type = getFinalType(inputValue.type);

      if (inputValue.type.kind === TypeKind.LIST) {
        if (!Array.isArray(curValue)) {
          throw Error(`Expected an array at path '${curKey}'`);
        }

        if (type?.kind === TypeKind.INPUT_OBJECT) {
          const actualType = introspectionResults.types.find(
            (t) => type.name === t.name && type.kind === t.kind,
          ) as IntrospectionInputObjectType;
          return {
            ...acum,
            [curKey]: curValue.map((item) =>
              buildCleanObjectByQueryType(introspectionResults)(
                item,
                actualType.inputFields,
              ),
            ),
          };
        }

        return {
          ...acum,
          [curKey]: curValue.map((item) =>
            buildCleanObjectByQueryType(introspectionResults)(item, [
              type as unknown as IntrospectionInputValue,
            ]),
          ),
        };
      }

      switch (type.kind) {
        case TypeKind.ENUM:
        case TypeKind.SCALAR:
          return { ...acum, [curKey]: curValue };

        case TypeKind.INPUT_OBJECT:
          const actualType = introspectionResults.types.find(
            (t) => type.name === t.name && type.kind === t.kind,
          );

          if (actualType?.kind !== TypeKind.INPUT_OBJECT) {
            console.debug('Field type not found, skipping', curKey);
            return acum;
          }

          return {
            ...acum,
            [curKey]: buildCleanObjectByQueryType(introspectionResults)(
              curValue,
              actualType.inputFields,
            ),
          };

        default:
          return acum;
      }
    }, {}) as T;
  };
