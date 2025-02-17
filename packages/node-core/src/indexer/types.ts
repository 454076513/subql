// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectNetworkConfig, RunnerSpecs} from '@subql/common';
import {Entity} from '@subql/types';
import {GraphQLSchema} from 'graphql';
import {ProcessBlockResponse} from './blockDispatcher';

export enum OperationType {
  Set = 'Set',
  Remove = 'Remove',
}

export type OperationEntity = {
  operation: OperationType;
  entityType: string;
  data: Entity | string;
};

export interface IProjectNetworkConfig extends ProjectNetworkConfig {
  chainId: string;
}

export interface ISubqueryProject<
  N extends IProjectNetworkConfig = IProjectNetworkConfig,
  DS = unknown,
  T = unknown,
  C = unknown
> {
  id: string;
  root: string;
  network: N;
  dataSources: DS[];
  schema: GraphQLSchema;
  templates: T[];
  chainTypes?: C;
  runner?: RunnerSpecs;
}

export interface IIndexerManager<B, DS> {
  start(): Promise<void>;
  indexBlock(block: B, datasources: DS[], ...args: any[]): Promise<ProcessBlockResponse>;
}

export interface IProjectService<DS> {
  blockOffset: number;
  dataSources: DS[];
  reindex(lastCorrectHeight: number): Promise<void>;
  setBlockOffset(offset: number): Promise<void>;
}
