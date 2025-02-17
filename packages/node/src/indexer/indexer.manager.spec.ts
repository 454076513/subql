// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
} from '@subql/common-substrate';
import {
  StoreService,
  PoiService,
  MmrService,
  NodeConfig,
  ConnectionPoolService,
  StoreCacheService,
} from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { Sequelize } from 'sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from './api.service';
import { ApiPromiseConnection } from './apiPromise.connection';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

jest.mock('sequelize', () => {
  const mSequelize = {
    authenticate: jest.fn(),
    define: () => ({
      findOne: jest.fn(),
      create: (input: any) => input,
    }),
    query: () => [{ nextval: 1 }],
    showAllSchemas: () => ['subquery_1'],
    model: () => ({ upsert: jest.fn() }),
    sync: jest.fn(),
    transaction: () => ({
      commit: jest.fn(),
      rollback: jest.fn(),
      afterCommit: jest.fn(),
    }),
    // createSchema: jest.fn(),
  };
  const actualSequelize = jest.requireActual('sequelize');
  return {
    Sequelize: jest.fn(() => mSequelize),
    DataTypes: actualSequelize.DataTypes,
    QueryTypes: actualSequelize.QueryTypes,
  };
});

jest.setTimeout(200000);

const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  networkEndpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
});

function testSubqueryProject_1(): SubqueryProject {
  return {
    network: {
      chainId: '0x',
      endpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
    },
    dataSources: [
      {
        name: 'runtime0',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          file: '',
          entryScript: '',
          handlers: [
            { handler: 'testSandbox', kind: SubstrateHandlerKind.Event },
          ],
        },
      },
      {
        name: 'runtime1',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            { handler: 'testSandbox', kind: SubstrateHandlerKind.Event },
          ],
        },
      },
    ],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  };
}

function testSubqueryProject_2(): SubqueryProject {
  return {
    network: {
      endpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
      dictionary: `https://api.subquery.network/sq/subquery/dictionary-polkadot`,
      chainId:
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    },
    dataSources: [
      {
        name: 'runtime0',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          file: '',
          entryScript: `console.log('test handler runtime0')`,
          handlers: [
            { handler: 'testSandbox', kind: SubstrateHandlerKind.Event },
          ],
        },
      },
    ],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  };
}

function createIndexerManager(
  project: SubqueryProject,
  connectionPoolService: ConnectionPoolService<ApiPromiseConnection>,
  nodeConfig: NodeConfig,
): IndexerManager {
  const sequilize = new Sequelize();
  const eventEmitter = new EventEmitter2();
  const apiService = new ApiService(
    project,
    connectionPoolService,
    eventEmitter,
    nodeConfig,
  );
  const dsProcessorService = new DsProcessorService(project, nodeConfig);
  const dynamicDsService = new DynamicDsService(dsProcessorService, project);

  const storeCache = new StoreCacheService(sequilize, nodeConfig, eventEmitter);
  const storeService = new StoreService(
    sequilize,
    nodeConfig,
    storeCache,
    project,
  );
  const poiService = new PoiService(storeCache);
  const mmrService = new MmrService(nodeConfig, storeCache);
  const unfinalizedBlocksService = new UnfinalizedBlocksService(
    apiService,
    nodeConfig,
    storeCache,
  );
  const sandboxService = new SandboxService(
    apiService,
    storeService,
    nodeConfig,
    project,
  );
  const projectService = new ProjectService(
    dsProcessorService,
    apiService,
    poiService,
    mmrService,
    sequilize,
    project,
    storeService,
    nodeConfig,
    dynamicDsService,
    eventEmitter,
    unfinalizedBlocksService,
  );

  return new IndexerManager(
    apiService,
    nodeConfig,
    sandboxService,
    dsProcessorService,
    dynamicDsService,
    unfinalizedBlocksService,
    projectService,
  );
}

/*
 * These tests aren't run because of setup requirements with such a large number of dependencies
 */
describe('IndexerManager', () => {
  let indexerManager: IndexerManager;

  afterEach(() => {
    (indexerManager as any)?.fetchService.onApplicationShutdown();
  });

  xit('should be able to start the manager (v0.0.1)', async () => {
    indexerManager = createIndexerManager(
      testSubqueryProject_1(),
      new ConnectionPoolService<ApiPromiseConnection>(),
      nodeConfig,
    );
    await expect(indexerManager.start()).resolves.toBe(undefined);

    expect(Object.keys((indexerManager as any).vms).length).toBe(1);
  });

  xit('should be able to start the manager (v0.2.0)', async () => {
    indexerManager = createIndexerManager(
      testSubqueryProject_2(),
      new ConnectionPoolService<ApiPromiseConnection>(),
      nodeConfig,
    );
    await expect(indexerManager.start()).resolves.toBe(undefined);

    expect(Object.keys((indexerManager as any).vms).length).toBe(1);
  });
});
