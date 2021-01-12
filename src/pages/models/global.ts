import { Model } from 'dva';

interface GlobalState {}

interface GlobalModel extends Model {
  state: GlobalState;
  namespace: 'global';
  effects: {};
  reducers: {};
}

const defaultGlobalState = {};

const globalModel = {
  state: defaultGlobalState,
  namespace: 'global',
} as GlobalModel;

export default globalModel;
