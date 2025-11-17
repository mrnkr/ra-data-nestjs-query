import {
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
  CREATE,
  UPDATE,
  DELETE,
  DELETE_MANY,
  UPDATE_MANY,
} from 'ra-core';
import buildVariables from './buildVariables';
import { IntrospectionField, IntrospectionScalarType, TypeKind } from 'graphql';
import { vi } from 'vitest';
import { introspectionResult } from './test-introspection';

global.console = {
  ...console,
  // uncomment to ignore a specific log level
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const getResourceByName = (name: string) =>
  introspectionResult.resources.find((resource) => resource.type.name === name);

describe(buildVariables.name, () => {
  describe(GET_LIST, () => {
    it('returns correct variables', () => {
      const params = {
        filter: {
          ids: ['foo1', 'foo2'],
          title: 'Foo',
          views: 100,
        },
        pagination: { page: 10, perPage: 10 },
        sort: { field: 'sortField', order: 'DESC' },
      };

      expect(
        buildVariables(introspectionResult)(
          {
            type: {
              kind: TypeKind.OBJECT,
              name: 'Post',
              fields: [
                {
                  name: 'title',
                  type: {
                    name: 'String',
                    kind: TypeKind.SCALAR,
                  } as IntrospectionScalarType,
                } as IntrospectionField,
              ],
              interfaces: [],
            },
          },
          GET_LIST,
          params,
          {},
        ),
      ).toEqual({
        filter: {
          id: { in: ['foo1', 'foo2'] },
          title: { iLike: 'Foo' },
          views: { eq: 100 },
        },
        paging: { limit: 10, offset: 90 },
        sorting: [{ field: 'sortField', direction: 'DESC' }],
      });
    });

    it('handles raw filters properly', () => {
      const params = {
        filter: {
          start: {
            between: {
              lower: '2024-08-15T03:00:00.000Z',
              upper: '2024-08-16T02:59:59.999Z',
            },
          },
        },
        pagination: { page: 1, perPage: 10 },
        sort: { field: 'name', order: 'ASC' },
      };

      const resource = getResourceByName('Booking');

      expect(
        buildVariables(introspectionResult)(
          resource,
          GET_LIST,
          params,
          resource[GET_LIST],
        ),
      ).toEqual({
        filter: {
          start: {
            between: {
              lower: '2024-08-15T03:00:00.000Z',
              upper: '2024-08-16T02:59:59.999Z',
            },
          },
        },
        paging: {
          limit: 10,
          offset: 0,
        },
        sorting: [
          {
            field: 'name',
            direction: 'ASC',
          },
        ],
      });
    });

    it('returns correct variables with sparse fieldset', () => {
      const params = {
        filter: {
          ids: ['foo1', 'foo2'],
          title: 'Foo',
          views: 100,
        },
        pagination: { page: 10, perPage: 10 },
        sort: { field: 'sortField', order: 'DESC' },
        meta: {
          sparseFields: ['id', 'name', 'location'],
        },
      };

      expect(
        buildVariables(introspectionResult)(
          {
            type: {
              kind: TypeKind.OBJECT,
              name: 'Post',
              fields: [
                {
                  name: 'title',
                  type: {
                    name: 'String',
                    kind: TypeKind.SCALAR,
                  } as IntrospectionScalarType,
                } as IntrospectionField,
              ],
              interfaces: [],
            },
          },
          GET_LIST,
          params,
          {},
        ),
      ).toEqual({
        filter: {
          id: { in: ['foo1', 'foo2'] },
          title: { iLike: 'Foo' },
          views: { eq: 100 },
        },
        paging: { limit: 10, offset: 90 },
        sorting: [{ field: 'sortField', direction: 'DESC' }],
        meta: {
          sparseFields: ['id', 'name', 'location'],
        },
      });
    });
  });

  describe(CREATE, () => {
    it('returns correct variables', () => {
      const params = {
        data: {
          name: 'Test club',
          location: {
            type: 'Point',
            coordinates: [-34.6490871, -58.3457883],
          },
          extraFieldToIgnore: 'pipipi',
        },
      };

      const resource = getResourceByName('Club');

      expect(
        buildVariables(introspectionResult)(
          resource,
          CREATE,
          params,
          resource[CREATE],
        ),
      ).toEqual({
        input: {
          club: {
            name: 'Test club',
            location: {
              type: 'Point',
              coordinates: [-34.6490871, -58.3457883],
            },
          },
        },
      });
    });

    it('returns correct variables for list of input objects', () => {
      const params = {
        data: {
          name: 'Test club',
          location: {
            type: 'Point',
            coordinates: [-34.6490871, -58.3457883],
          },
          extraFieldToIgnore: 'pipipi',
          points: [
            {
              type: 'Point',
              coordinates: [-34.6490871, -58.3457883],
              extraFieldToIgnore: 'pipipi',
            },
            {
              type: 'Point',
              coordinates: [-42.6490871, -57.3457883],
              extraFieldToIgnore: 'pipipi',
            },
          ],
        },
      };

      const resource = getResourceByName('Club');

      expect(
        buildVariables(introspectionResult)(
          resource,
          CREATE,
          params,
          resource[CREATE],
        ),
      ).toEqual({
        input: {
          club: {
            name: 'Test club',
            location: {
              type: 'Point',
              coordinates: [-34.6490871, -58.3457883],
            },
            points: [
              {
                type: 'Point',
                coordinates: [-34.6490871, -58.3457883],
              },
              {
                type: 'Point',
                coordinates: [-42.6490871, -57.3457883],
              },
            ],
          },
        },
      });
    });
  });

  describe(UPDATE, () => {
    it('returns correct variables', () => {
      const params = {
        id: '7c28654a-cffa-4723-b5d3-99142469f4b8',
        data: {
          id: '7c28654a-cffa-4723-b5d3-99142469f4b8',
          name: 'Test club',
          location: {
            type: 'Point',
            coordinates: [-34.6490871, -58.3457883],
          },
          createdAt: new Date(),
          createdBy: 'a59f7d84-ae82-4f2e-bd27-967b92314eaf',
          updatedAt: new Date(),
          updatedBy: 'c2415901-faa3-43c3-9da7-f29de98e6988',
        },
      };

      const resource = getResourceByName('Club');

      expect(
        buildVariables(introspectionResult)(
          resource,
          UPDATE,
          params,
          resource[UPDATE],
        ),
      ).toEqual({
        input: {
          id: '7c28654a-cffa-4723-b5d3-99142469f4b8',
          update: {
            name: 'Test club',
            location: {
              type: 'Point',
              coordinates: [-34.6490871, -58.3457883],
            },
          },
        },
      });
    });
  });

  describe(GET_MANY, () => {
    it('returns correct variables', () => {
      const params = {
        ids: ['tag1', 'tag2'],
      };

      const resource = getResourceByName('Club');

      expect(
        buildVariables(introspectionResult)(
          resource,
          GET_MANY,
          params,
          resource[GET_MANY],
        ),
      ).toEqual({
        filter: { id: { in: ['tag1', 'tag2'] } },
        paging: {
          limit: 2,
          offset: 0,
        },
      });
    });

    it('returns correct variables with sparse fieldset', () => {
      const params = {
        ids: ['tag1', 'tag2'],
        meta: {
          sparseFields: ['id', 'name', 'location'],
        },
      };

      const resource = getResourceByName('Club');

      expect(
        buildVariables(introspectionResult)(
          resource,
          GET_MANY,
          params,
          resource[GET_MANY],
        ),
      ).toEqual({
        filter: { id: { in: ['tag1', 'tag2'] } },
        paging: {
          limit: 2,
          offset: 0,
        },
        meta: {
          sparseFields: ['id', 'name', 'location'],
        },
      });
    });
  });

  describe(GET_MANY_REFERENCE, () => {
    it('returns correct variables', () => {
      const params = {
        target: 'club',
        id: '103daae0-ef3f-4f1b-a114-528df8047cb4',
        filter: { sport: 'Football' },
        pagination: { page: 1, perPage: 10 },
        sort: { field: 'name', order: 'ASC' },
      };

      const resource = getResourceByName('Field');

      expect(
        buildVariables(introspectionResult)(
          resource,
          GET_MANY_REFERENCE,
          params,
          resource[GET_MANY_REFERENCE],
        ),
      ).toEqual({
        filter: { club: { id: { eq: params.id } }, sport: { eq: 'Football' } },
        paging: {
          limit: 10,
          offset: 0,
        },
        sorting: [
          {
            field: 'name',
            direction: 'ASC',
          },
        ],
      });
    });

    it('handles arrays of references properly (ReferenceManyField)', () => {
      const params = {
        target: 'timeSlot',
        id: [
          '5beff9db-9a74-4308-be21-52a45da28dca',
          '7eac668a-de0a-4796-a4f9-5f2a1df76d9b',
          '56d9b879-5acc-4d5e-9ab1-8952a89b460a',
        ],
        pagination: { page: 1, perPage: 10 },
        sort: { field: 'name', order: 'ASC' },
      };

      const resource = getResourceByName('Booking');

      expect(
        buildVariables(introspectionResult)(
          resource,
          GET_MANY_REFERENCE,
          params,
          resource[GET_MANY_REFERENCE],
        ),
      ).toEqual({
        filter: { timeSlot: { id: { in: params.id } } },
        paging: {
          limit: 10,
          offset: 0,
        },
        sorting: [
          {
            field: 'name',
            direction: 'ASC',
          },
        ],
      });
    });

    it('handles raw filters properly', () => {
      const params = {
        target: 'field',
        id: '103daae0-ef3f-4f1b-a114-528df8047cb4',
        filter: {
          start: {
            between: {
              lower: '2024-08-15T03:00:00.000Z',
              upper: '2024-08-16T02:59:59.999Z',
            },
          },
        },
        pagination: { page: 1, perPage: 10 },
        sort: { field: 'name', order: 'ASC' },
      };

      const resource = getResourceByName('Booking');

      expect(
        buildVariables(introspectionResult)(
          resource,
          GET_MANY_REFERENCE,
          params,
          resource[GET_MANY_REFERENCE],
        ),
      ).toEqual({
        filter: {
          field: { id: { eq: params.id } },
          start: {
            between: {
              lower: '2024-08-15T03:00:00.000Z',
              upper: '2024-08-16T02:59:59.999Z',
            },
          },
        },
        paging: {
          limit: 10,
          offset: 0,
        },
        sorting: [
          {
            field: 'name',
            direction: 'ASC',
          },
        ],
      });
    });

    it('returns correct variables with sparse fieldset', () => {
      const params = {
        target: 'club',
        id: '103daae0-ef3f-4f1b-a114-528df8047cb4',
        filter: { sport: 'Football' },
        pagination: { page: 1, perPage: 10 },
        sort: { field: 'name', order: 'ASC' },
        meta: {
          sparseFields: ['id', 'name', 'location'],
        },
      };

      const resource = getResourceByName('Field');

      expect(
        buildVariables(introspectionResult)(
          resource,
          GET_MANY_REFERENCE,
          params,
          resource[GET_MANY_REFERENCE],
        ),
      ).toEqual({
        filter: { club: { id: { eq: params.id } }, sport: { eq: 'Football' } },
        paging: {
          limit: 10,
          offset: 0,
        },
        sorting: [
          {
            field: 'name',
            direction: 'ASC',
          },
        ],
        meta: {
          sparseFields: ['id', 'name', 'location'],
        },
      });
    });
  });

  describe(DELETE, () => {
    it('returns correct variables', () => {
      const params = {
        id: 'post1',
      };

      const resource = getResourceByName('Club');

      expect(
        buildVariables(introspectionResult)(
          resource,
          DELETE,
          params,
          resource[DELETE],
        ),
      ).toEqual({
        input: {
          id: 'post1',
        },
      });
    });
  });

  describe(DELETE_MANY, () => {
    it('returns correct variables', () => {
      const params = {
        ids: [
          '12817482-2f5d-47ae-bb41-15fb63bc2cae',
          '7aebbf30-56f6-4f84-a4c8-6da499608b2a',
        ],
      };

      const resource = getResourceByName('Club');

      expect(
        buildVariables(introspectionResult)(
          resource,
          DELETE_MANY,
          params,
          resource[DELETE_MANY],
        ),
      ).toEqual({
        input: {
          filter: { id: { in: params.ids } },
        },
      });
    });
  });

  describe(UPDATE_MANY, () => {
    it('returns correct variables', () => {
      const params = {
        ids: [
          '7c28654a-cffa-4723-b5d3-99142469f4b8',
          'e57e77fa-4989-4926-ab42-697667305b82',
          '6aaeb324-d63f-4106-806b-712b2dec4805',
        ],
        data: {
          name: 'Test club',
          location: {
            type: 'Point',
            coordinates: [-34.6490871, -58.3457883],
          },
          randomFieldToExclude: 'pipipi',
          createdAt: new Date(),
          createdBy: 'a59f7d84-ae82-4f2e-bd27-967b92314eaf',
          updatedAt: new Date(),
          updatedBy: 'c2415901-faa3-43c3-9da7-f29de98e6988',
        },
      };

      const resource = getResourceByName('Club');

      expect(
        buildVariables(introspectionResult)(
          resource,
          UPDATE_MANY,
          params,
          resource[UPDATE_MANY],
        ),
      ).toEqual({
        input: {
          filter: {
            id: { in: params.ids },
          },
          update: {
            name: 'Test club',
            location: {
              type: 'Point',
              coordinates: [-34.6490871, -58.3457883],
            },
          },
        },
      });
    });
  });
});
