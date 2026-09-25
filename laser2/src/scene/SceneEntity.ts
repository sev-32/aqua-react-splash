export type SceneEntityGroup = 'overview' | 'hull' | 'steering' | 'rig' | 'sails' | 'ropes' | 'hardware' | 'crew' | 'environment' | 'diagnostics';

export interface SceneEntity {
  id: string;
  name: string;
  group: SceneEntityGroup;
  objects: any[];
  sourceBinding: string;
  verified: boolean;
  description: string;
  triangleCount: number;
}

export interface BindingTuple {
  readonly index: number;
  readonly id: string;
  readonly name: string;
  readonly group: SceneEntityGroup;
}
