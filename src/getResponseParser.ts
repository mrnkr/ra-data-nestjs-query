import {
  DELETE_MANY,
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
  UPDATE_MANY,
} from 'ra-core';
import { IntrospectionResult } from 'ra-data-graphql';
import { ApolloQueryResult } from '@apollo/client';
import { Connection } from './types';

export default (_introspectionResults: IntrospectionResult) =>
  (raFetchMethod: string, params?: any) =>
  (response: ApolloQueryResult<any>) => {
    const data = response.data;

    if (
      raFetchMethod === GET_LIST ||
      raFetchMethod === GET_MANY ||
      raFetchMethod === GET_MANY_REFERENCE
    ) {
      const data = response.data as { data: Connection };
      return {
        data: data.data.nodes.map(sanitizeResource),
        total: data.data.totalCount,
      };
    } else if (raFetchMethod === DELETE_MANY || raFetchMethod === UPDATE_MANY) {
      return { data: params.ids };
    }

    return { data: sanitizeResource(data.data) };
  };

const sanitizeResource = (data: any) => {
  const result = Object.keys(data).reduce((acc, key) => {
    if (key.startsWith('_')) {
      return acc;
    }

    const dataForKey = data[key];

    if (dataForKey === null || dataForKey === undefined) {
      return acc;
    }

    if (Array.isArray(dataForKey)) {
      if (
        typeof dataForKey[0] === 'object' &&
        dataForKey[0] !== null &&
        // If there is no id, it's not a reference but an embedded array
        dataForKey[0].id !== null
      ) {
        return {
          ...acc,
          [key]: dataForKey.map(sanitizeResource),
          [`${key}Ids`]: dataForKey.map((d) => d.id),
        };
      } else {
        return { ...acc, [key]: dataForKey };
      }
    }

    if (
      typeof dataForKey === 'object' &&
      dataForKey !== null &&
      // If there is no id, it's not a reference but an embedded object
      dataForKey.id !== null
    ) {
      return {
        ...acc,
        ...(dataForKey &&
          dataForKey.id && {
            [`${key}.id`]: dataForKey.id,
          }),
        // We should only sanitize gql types, not objects
        [key]: dataForKey.__typename
          ? sanitizeResource(dataForKey)
          : dataForKey,
      };
    }

    return { ...acc, [key]: dataForKey };
  }, {});

  return result;
};
