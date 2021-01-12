import React, { useReducer, Reducer, useEffect, useMemo } from 'react';

import { Action } from 'umi';

import {
  Biz,
  BizWSConifg,
  BizWSErrorType,
  BizWSError,
  UserOrderEventCode,
} from '@utc-api-js/core';

import { message as AntdMessage, Button, Row, Input, Card, Spin } from 'antd';

const biz = new Biz(0);

interface TestAction extends Action {
  orderId?: string;
  loading?: boolean;
  vin?: string;
  code?: number;
  mapId?: string;
  tripFrom?: string;
  tripTo?: string;
}

enum TestActions {
  SetOrderId = 'SetOrderId',
  SetVin = 'SetVin',
  SetCode = 'SetCode',
  SetLoading = 'SetLoading',
  SetMap = 'SetMap',
  SetTripFrom = 'SetTripFrom',
  SetTripTo = 'SetTripTo',
}

interface TestState {
  orderId: string;
  loading: boolean;
  vin: string;
  code: number;
  mapId: string;
  tripFrom: string;
  tripTo: string;
}

const defaultTestState: TestState = {
  loading: false,
  orderId: '',
  vin: '',
  code: -1,
  mapId: '2020120314',
  tripFrom: '1',
  tripTo: '3',
};

const testReducer: Reducer<TestState, TestAction> = (state, action) => {
  switch (action.type) {
    case TestActions.SetLoading:
      return {
        ...state,
        loading: action?.loading || false,
      };
    case TestActions.SetOrderId:
      return {
        ...state,
        orderId: action?.orderId || '',
      };
    case TestActions.SetVin:
      return {
        ...state,
        vin: action?.vin || '',
      };
    case TestActions.SetCode:
      return {
        ...state,
        code: action?.code || -1,
      };
    case TestActions.SetMap:
      return {
        ...state,
        mapId: action?.mapId || '',
      };
    case TestActions.SetTripFrom:
      return {
        ...state,
        tripFrom: action?.tripFrom || '',
      };
    case TestActions.SetTripTo:
      return {
        ...state,
        tripTo: action?.tripTo || '',
      };
  }

  return {
    ...state,
  };
};

interface UserTestViewProps {
  wsConfig: BizWSConifg;
}

export const UserTestView: React.FC<UserTestViewProps> = ({ wsConfig }) => {
  const [state, dispatch] = useReducer(testReducer, defaultTestState);

  const setOrderId = async (orderId: string) =>
    dispatch({ type: TestActions.SetOrderId, orderId });

  const setVin = async (vin: string) =>
    dispatch({ type: TestActions.SetVin, vin });

  const setCode = async (code: number) =>
    dispatch({ type: TestActions.SetCode, code });

  const setLoading = async (loading: boolean) =>
    dispatch({ type: TestActions.SetLoading, loading });

  const setMapId = async (mapId: string) =>
    dispatch({ type: TestActions.SetMap, mapId });

  const setTripFrom = async (tripFrom: string) =>
    dispatch({
      type: TestActions.SetTripFrom,
      tripFrom,
    });

  const setTripTo = async (tripTo: string) =>
    dispatch({ type: TestActions.SetTripTo, tripTo });

  /**
   * mapId: 20201119
   * tripFrom: 7
   * tripTo: 2
   */
  const createOrder = async (): Promise<string> => {
    try {
      const orderId = await biz.createTripOrder(
        state.tripFrom,
        state.tripTo,
        state.mapId,
      );
      if (orderId == '') {
        throw new Error('order id is empty');
      }
      await setOrderId(orderId);
      return orderId;
    } catch (e) {
      AntdMessage.error('订单创建失败');
    }
    return '';
  };

  const findInServiceOrder = async () => {
    const order = await biz.getUserInServiceOrder();
    if (order?.orderId) {
      setOrderId(order.orderId);
      setVin(order.vehicleExternalId);
      watchOrder(order.orderId);
    }
  };

  const listenOrder = async (
    orderId: string,
    {
      yes,
      no,
      timeout,
    }: {
      yes: (vin: string) => void;
      no?: (message?: string) => void;
      timeout?: () => void;
    },
  ): Promise<any> => {
    try {
      const vin = await biz.queryOrder(wsConfig, orderId, 30 * 1000);
      console.debug(`query order response: ${vin}`);
      if (yes) {
        yes(vin);
      }
    } catch (e) {
      console.debug(`query order error: ${e.message}`);
      if (e instanceof BizWSError) {
        const errorType = e.errorType;
        switch (errorType) {
          case BizWSErrorType.Timeout:
            if (timeout) {
              timeout();
            }
            break;
          case BizWSErrorType.Duplicate:
          case BizWSErrorType.Abort:
            break;
          case BizWSErrorType.Error:
          default:
            if (no) {
              no(e.message);
            }
            break;
        }
      } else {
        if (no) {
          no();
        }
      }
    }
  };

  const reset = () => {
    setOrderId('');
    setCode(-1);
    setVin('');
  };

  const watchOrder = async (orderId: string): Promise<any> => {
    try {
      await biz.watchUserOrderEvent(wsConfig, orderId, code => {
        setCode(code);
        switch (code) {
          case UserOrderEventCode.AutoComplete:
            AntdMessage.info('订单自动完成');
            reset();
            break;
          case UserOrderEventCode.AutoCancel:
            AntdMessage.info('订单自动取消');
            reset();
            break;
          case UserOrderEventCode.ArrivedPickUp:
            AntdMessage.info('车辆达到上车点');
            break;
          case UserOrderEventCode.ArrivedGetOff:
            AntdMessage.info('车辆达到下车点');
            break;
          case UserOrderEventCode.DriverOrderCanceled:
            AntdMessage.info('订单已被司机取消');
            reset();
            break;
          case UserOrderEventCode.UserPickUp:
            AntdMessage.info('用户已上车');
            break;
          default:
            AntdMessage.info('订单出错');
            cancel(orderId);
            break;
        }
      });
    } catch (e) {
      console.debug(`watch order error: ${e.message}`);
      if (e instanceof BizWSError) {
        const errorType = e.errorType;
        switch (errorType) {
          case BizWSErrorType.Duplicate:
            break;
          case BizWSErrorType.Abort:
            break;
          case BizWSErrorType.Error:
          default:
            AntdMessage.error(e.message);
            break;
        }
      } else {
        AntdMessage.error(e.message);
      }
    }
  };

  const createAndListen = async (): Promise<void> => {
    try {
      setLoading(true);
      const orderId = await createOrder();
      if (orderId != '') {
        listenOrder(orderId, {
          yes: vin => {
            setVin(vin);
            watchOrder(orderId);
          },
          no: async msg => {
            try {
              await biz.cancelUserOrder(orderId);
              await reset();
            } catch (e) {}
            AntdMessage.error('约车失败');
          },
          timeout: async () => {
            try {
              await biz.cancelUserOrder(orderId);
              await reset();
            } catch (e) {}
            AntdMessage.info('约车超时');
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (orderId: string): Promise<boolean> => {
    if (state.orderId === '') return true;
    try {
      await biz.cancelUserOrder(orderId);
      await reset();
      AntdMessage.info('取消订单成功');
      return true;
    } catch (e) {
      AntdMessage.error(e.message);
    }
    return false;
  };

  const complete = async (orderId: string): Promise<void> => {
    if (orderId === '') return;
    try {
      await biz.completeUserOrder(orderId);
      await reset();
      AntdMessage.info('完成订单成功');
    } catch (e) {
      AntdMessage.error(e.message);
    }
  };

  const canCreate = useMemo(() => state.orderId === '', [state.orderId]);

  const canCompleted = useMemo(
    () => state.code === UserOrderEventCode.ArrivedGetOff,
    [state.code],
  );

  const canCanceled = useMemo(
    () =>
      [UserOrderEventCode.ArrivedGetOff, UserOrderEventCode.UserPickUp].indexOf(
        state.code,
      ) === -1 && state.orderId !== '',
    [state.code, state.orderId],
  );

  useEffect(() => {
    findInServiceOrder();
  }, []);

  return (
    <Spin tip="Loading..." spinning={state.loading}>
      <Card title="乘客端">
        <Row>
          <label>
            订单 id
            <Input
              value={state.orderId}
              onChange={e => setOrderId(e.target.value)}
            />
          </label>
        </Row>
        <Row>
          <label>
            地图 id
            <Input
              value={state.mapId}
              onChange={e => setMapId(e.target.value)}
            />
          </label>
        </Row>
        <Row>
          <label>
            上车点
            <Input
              value={state.tripFrom}
              onChange={e => setTripFrom(e.target.value)}
            />
          </label>
        </Row>
        <Row>
          <label>
            下车点
            <Input
              value={state.tripTo}
              onChange={e => setTripTo(e.target.value)}
            />
          </label>
        </Row>
        <Row>
          <label>
            车辆 id：&nbsp;&nbsp;
            {state.vin}
          </label>
        </Row>
        <Row>
          <label>
            订单状态码：&nbsp;&nbsp;
            {state.code}
          </label>
        </Row>
        <Row>
          <Button disabled={!canCreate} onClick={createAndListen}>
            创建订单
          </Button>
          <Button disabled={!canCanceled} onClick={() => cancel(state.orderId)}>
            取消订单
          </Button>
          <Button
            disabled={!canCompleted}
            onClick={() => complete(state.orderId)}
          >
            完成订单
          </Button>
        </Row>
      </Card>
    </Spin>
  );
};
