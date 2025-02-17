// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {AnyTuple, RegistryTypes} from '@polkadot/types/types';
import {SubstrateBlock, SubstrateEvent, SubstrateExtrinsic} from './interfaces';

export enum SubstrateDatasourceKind {
  Runtime = 'substrate/Runtime',
}

export enum SubstrateHandlerKind {
  Block = 'substrate/BlockHandler',
  Call = 'substrate/CallHandler',
  Event = 'substrate/EventHandler',
}

export type RuntimeHandlerInputMap<T extends AnyTuple = AnyTuple> = {
  [SubstrateHandlerKind.Block]: SubstrateBlock;
  [SubstrateHandlerKind.Event]: SubstrateEvent<T>;
  [SubstrateHandlerKind.Call]: SubstrateExtrinsic<T>;
};

type RuntimeFilterMap = {
  [SubstrateHandlerKind.Block]: SubstrateNetworkFilter;
  [SubstrateHandlerKind.Event]: SubstrateEventFilter;
  [SubstrateHandlerKind.Call]: SubstrateCallFilter;
};

export interface ProjectManifest {
  specVersion: string;
  description: string;
  repository: string;

  schema: string;

  network: {
    endpoint: string;
    customTypes?: RegistryTypes;
  };

  bypassBlocks?: number[];
  dataSources: SubstrateDatasource[];
}

// [startSpecVersion?, endSpecVersion?] closed range
export type SpecVersionRange = [number, number];

interface SubstrateBaseHandlerFilter {
  specVersion?: SpecVersionRange;
}

export interface SubstrateBlockFilter extends SubstrateBaseHandlerFilter {
  modulo?: number;
  timestamp?: string;
}

export interface SubstrateEventFilter extends SubstrateBaseHandlerFilter {
  module?: string;
  method?: string;
}

export interface SubstrateCallFilter extends SubstrateEventFilter {
  success?: boolean;
}

export type SubstrateBlockHandler = SubstrateCustomHandler<SubstrateHandlerKind.Block, SubstrateBlockFilter>;
export type SubstrateCallHandler = SubstrateCustomHandler<SubstrateHandlerKind.Call, SubstrateCallFilter>;
export type SubstrateEventHandler = SubstrateCustomHandler<SubstrateHandlerKind.Event, SubstrateEventFilter>;

export interface SubstrateCustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export type SubstrateRuntimeHandler = SubstrateBlockHandler | SubstrateCallHandler | SubstrateEventHandler;
export type SubstrateHandler = SubstrateRuntimeHandler | SubstrateCustomHandler<string, unknown>;
export type SubstrateRuntimeHandlerFilter = SubstrateBlockFilter | SubstrateCallFilter | SubstrateEventFilter;

export interface SubstrateMapping<T extends SubstrateHandler = SubstrateHandler> extends FileReference {
  handlers: T[];
}

interface ISubstrateDatasource<M extends SubstrateMapping, F extends SubstrateNetworkFilter = SubstrateNetworkFilter> {
  name?: string;
  kind: string;
  filter?: F;
  startBlock?: number;
  mapping: M;
}

export interface SubstrateRuntimeDatasource<
  M extends SubstrateMapping<SubstrateRuntimeHandler> = SubstrateMapping<SubstrateRuntimeHandler>
> extends ISubstrateDatasource<M> {
  kind: SubstrateDatasourceKind.Runtime;
}

export interface SubstrateNetworkFilter {
  specName?: string;
}

export type SubstrateDatasource = SubstrateRuntimeDatasource | SubstrateCustomDatasource;

export interface FileReference {
  file: string;
}

export type CustomDataSourceAsset = FileReference;

export type Processor<O = any> = FileReference & {options?: O};

export interface SubstrateCustomDatasource<
  K extends string = string,
  T extends SubstrateNetworkFilter = SubstrateNetworkFilter,
  M extends SubstrateMapping = SubstrateMapping<SubstrateCustomHandler>,
  O = any
> extends ISubstrateDatasource<M, T> {
  kind: K;
  assets: Map<string, CustomDataSourceAsset>;
  processor: Processor<O>;
}

//export type SubstrateBuiltinDataSource = ISubstrateDatasource;

export interface HandlerInputTransformer_0_0_0<
  T extends SubstrateHandlerKind,
  E,
  IT extends AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> {
  (input: RuntimeHandlerInputMap<IT>[T], ds: DS, api: ApiPromise, assets?: Record<string, string>): Promise<E>; //  | SubstrateBuiltinDataSource
}

export interface HandlerInputTransformer_1_0_0<
  T extends SubstrateHandlerKind,
  F,
  E,
  IT extends AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> {
  (params: {
    input: RuntimeHandlerInputMap<IT>[T];
    ds: DS;
    filter?: F;
    api: ApiPromise;
    assets?: Record<string, string>;
  }): Promise<E[]>; //  | SubstrateBuiltinDataSource
}

type SecondLayerHandlerProcessorArray<
  K extends string,
  F extends SubstrateNetworkFilter,
  T,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource<K, F> = SubstrateCustomDatasource<K, F>
> =
  | SecondLayerHandlerProcessor<SubstrateHandlerKind.Block, F, T, IT, DS>
  | SecondLayerHandlerProcessor<SubstrateHandlerKind.Call, F, T, IT, DS>
  | SecondLayerHandlerProcessor<SubstrateHandlerKind.Event, F, T, IT, DS>;

export interface SubstrateDatasourceProcessor<
  K extends string,
  F extends SubstrateNetworkFilter,
  DS extends SubstrateCustomDatasource<K, F> = SubstrateCustomDatasource<K, F>,
  P extends Record<string, SecondLayerHandlerProcessorArray<K, F, any, any, DS>> = Record<
    string,
    SecondLayerHandlerProcessorArray<K, F, any, any, DS>
  >
> {
  kind: K;
  validate(ds: DS, assets: Record<string, string>): void;
  dsFilterProcessor(ds: DS, api: ApiPromise): boolean;
  handlerProcessors: P;
}

export interface DictionaryQueryCondition {
  field: string;
  value: string;
  matcher?: string; // defaults to "equalTo", use "contains" for JSON
}

export interface DictionaryQueryEntry {
  entity: string;
  conditions: DictionaryQueryCondition[];
}

interface SecondLayerHandlerProcessorBase<
  K extends SubstrateHandlerKind,
  F,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> {
  baseHandlerKind: K;
  baseFilter: RuntimeFilterMap[K] | RuntimeFilterMap[K][];
  filterValidator: (filter?: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry | undefined;
}

// only allow one custom handler for each baseHandler kind
export interface SecondLayerHandlerProcessor_0_0_0<
  K extends SubstrateHandlerKind,
  F,
  E,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: undefined;
  transformer: HandlerInputTransformer_0_0_0<K, E, IT, DS>;
  filterProcessor: (filter: F | undefined, input: RuntimeHandlerInputMap<IT>[K], ds: DS) => boolean;
}

export interface SecondLayerHandlerProcessor_1_0_0<
  K extends SubstrateHandlerKind,
  F,
  E,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> extends SecondLayerHandlerProcessorBase<K, F, DS> {
  specVersion: '1.0.0';
  transformer: HandlerInputTransformer_1_0_0<K, F, E, IT, DS>;
  filterProcessor: (params: {filter: F | undefined; input: RuntimeHandlerInputMap<IT>[K]; ds: DS}) => boolean;
}

export type SecondLayerHandlerProcessor<
  K extends SubstrateHandlerKind,
  F,
  E,
  IT extends AnyTuple = AnyTuple,
  DS extends SubstrateCustomDatasource = SubstrateCustomDatasource
> = SecondLayerHandlerProcessor_0_0_0<K, F, E, IT, DS> | SecondLayerHandlerProcessor_1_0_0<K, F, E, IT, DS>;
