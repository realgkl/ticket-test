import React, { useReducer, Reducer } from 'react';

import { Action } from 'umi';

import { BizWSConifg } from '@utc-api-js/core';

import { Row, Col } from 'antd';

import { UserTestView } from './components/user';
import { DriverTestView } from './components/driver';

import styles from './index.less';

const wsConfig: BizWSConifg = {
  ssl: false,
  host: '127.0.0.1',
  port: 8080,
  base: '/order/ws',
  debug: true,
};

const TestMain: React.FC<{}> = () => {
  return (
    <Row>
      <Col span="12">
        <UserTestView wsConfig={wsConfig} />
      </Col>
      <Col span="12">
        <DriverTestView wsConfig={wsConfig} />
      </Col>
    </Row>
  );
};

export default TestMain;
