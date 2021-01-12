import React, { useReducer, Reducer, useMemo, useEffect } from 'react';

import { Action } from 'umi';

import { message as AntdMessage, Button, Row, Input, Card, Spin } from 'antd';

import {
  RobotaxiDriverBiz,
  BizWSConifg,
  BizWSErrorType,
  BizWSError,
  RobotaxiDriverOrderEventCode,
  RobotaxiDriverOrderInService,
  RobotaxiDriverOrderState,
} from '@utc-api-js/core';

const biz = new RobotaxiDriverBiz();

interface DriverTestViewProps {
  wsConfig: BizWSConifg;
}

interface TestAction extends Action {
  orderId?: string;
  loading?: boolean;
  vin?: string;
  code?: number;
  order?: RobotaxiDriverOrderInService;
}

enum TestActions {
  SetOrderId = 'SetOrderId',
  SetVin = 'SetVin',
  SetCode = 'SetCode',
  SetLoading = 'SetLoading',
  SetOrder = 'SetOrder',
}

interface TestState {
  orderId: string;
  loading: boolean;
  vin: string;
  code: number;
  order: RobotaxiDriverOrderInService | undefined;
}

const defaultTestState: TestState = {
  loading: false,
  orderId: '',
  vin: 'e100.carxm.sim',
  code: -1,
  order: undefined,
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
    case TestActions.SetOrder:
      return {
        ...state,
        order: action.order,
      };
  }

  return {
    ...state,
  };
};

export const DriverTestView: React.FC<DriverTestViewProps> = ({ wsConfig }) => {
  const [state, dispatch] = useReducer(testReducer, defaultTestState);

  const setOrderId = async (orderId: string) =>
    dispatch({ type: TestActions.SetOrderId, orderId });

  const setVin = async (vin: string) =>
    dispatch({ type: TestActions.SetVin, vin });

  const setCode = async (code: number) =>
    dispatch({ type: TestActions.SetCode, code });

  const setLoading = async (loading: boolean) =>
    dispatch({ type: TestActions.SetLoading, loading });

  const setOrder = async (order?: RobotaxiDriverOrderInService) =>
    dispatch({ type: TestActions.SetOrder, order });

  const createOrder = async (): Promise<string> => {
    try {
      const orderId = await biz.createOrder(state.vin, '20190911');
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
    const order = await biz.getInServiceOrder();
    if (order?.orderId) {
      setOrderId(order.orderId);
      watchOrder(order.orderId);
    }
  };

  const reset = () => {
    setOrderId('');
    setCode(-1);
    setOrder(undefined);
  };

  const watchOrder = async (orderId: string): Promise<any> => {
    try {
      await biz.watchOrderEvent(wsConfig, orderId, async code => {
        setCode(code);
        switch (code) {
          case RobotaxiDriverOrderEventCode.AutoComplete:
            AntdMessage.info('订单自动完成');
            reset();
            break;
          case RobotaxiDriverOrderEventCode.AutoCancel:
            AntdMessage.info('订单自动取消');
            reset();
            break;
          case RobotaxiDriverOrderEventCode.UserOrderCanceled:
            AntdMessage.info('用户取消订单');
            reset();
            break;
          case RobotaxiDriverOrderEventCode.UserOrderConfirmed:
            AntdMessage.info('已接收到订单');
            const order = await biz.getInServiceOrder();
            setOrder(order);
            break;
          case RobotaxiDriverOrderEventCode.ArrivedPickUp:
            AntdMessage.info('车辆达到上车点');
            break;
          case RobotaxiDriverOrderEventCode.UserPickUp:
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
        watchOrder(orderId);
      }
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (orderId: string): Promise<boolean> => {
    if (state.orderId === '') return true;
    try {
      await biz.cancel(orderId);
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
      await biz.complete(orderId);
      await reset();
      AntdMessage.info('完成订单成功');
    } catch (e) {
      AntdMessage.error(e.message);
    }
  };

  const arrivedPickUp = async (orderId: string): Promise<void> => {
    if (orderId === '') return;
    try {
      await biz.arrivedPickUp(orderId);
      AntdMessage.info('到达上车点');
    } catch (e) {
      AntdMessage.error(e.message);
    }
  };

  const canCreate = useMemo(() => state.orderId === '', [state.orderId]);

  const canArrivedPickUp = useMemo(
    () => state.code === RobotaxiDriverOrderEventCode.UserOrderConfirmed,
    [state.code],
  );

  const canPickUp = useMemo(
    () => state.code === RobotaxiDriverOrderEventCode.ArrivedPickUp,
    [state.code],
  );

  const canCompleted = useMemo(
    () => state.code === RobotaxiDriverOrderEventCode.UserPickUp,
    [state.code],
  );

  const canCanceled = useMemo(
    () =>
      [
        RobotaxiDriverOrderEventCode.ArrivedPickUp,
        RobotaxiDriverOrderEventCode.UserPickUp,
        RobotaxiDriverOrderEventCode.UserOrderNotCompleted,
      ].indexOf(state.code) === -1 && state.orderId !== '',
    [state.code, state.orderId],
  );

  useEffect(() => {
    findInServiceOrder();
  }, []);

  return (
    <Spin tip="Loading..." spinning={state.loading}>
      <Card title="司机端">
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
            用户订单 id：&nbsp;&nbsp;
            {state.order?.userOrderId}&nbsp;&nbsp; 用户姓名：&nbsp;&nbsp;
            {state.order?.username}&nbsp;&nbsp; 用户手机：&nbsp;&nbsp;
            {state.order?.userMobile}
          </label>
        </Row>
        <Row>
          <label>
            上车点：&nbsp;&nbsp;
            {state.order?.userOrderTripFrom}&nbsp;&nbsp; 下车点：&nbsp;&nbsp;
            {state.order?.userOrderTripTo}
          </label>
        </Row>
        <Row>
          <label>
            车辆 id：
            <Input value={state.vin} onChange={e => setVin(e.target.value)} />
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
            disabled={!canArrivedPickUp}
            onClick={() => arrivedPickUp(state.orderId)}
          >
            到达上车点
          </Button>
          <Button
            disabled={!canCompleted}
            onClick={() => complete(state.orderId)}
          >
            上车
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
