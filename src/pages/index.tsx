import React, { useReducer, Reducer } from 'react';

import { Action } from 'umi';

import { BizWSConifg } from '@utc-api-js/core';

import { Row, Col } from 'antd';

import { UserTestView } from './components/user';
import { DriverTestView } from './components/driver';

import styles from './index.less';

const wsConfig: BizWSConifg = {
  ssl: true,
  host: 'ucloud.uisee.cn',
  port: 30123,
  base: '/api/test/order/ws',
  debug: true,
};

const groupId = '917ea77f-3932-11eb-ae58-1a1b512b9a7c';
const defAuthToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MTE2NTI0MzUsImlhdCI6MTYxMDQ0MjgzNSwiaXNzIjoib3dDWldFVEh5cHhlWkNaT3dOVHdwZlY4WFVnZkdWNTQiLCJuYmYiOjE2MTA0NDI4MzUsInVpZCI6ImdrbDEwMzg1LmRvbmdmZW5nLXJvYm90YXhpIn0.ZOMlLtICugjHbterz5SnmR_HprfWDnOClPsbXpOuf8U`;
const urlAuthToken = new URL(location.href).searchParams.get('authToken');
const authToken = urlAuthToken ? urlAuthToken : defAuthToken;

document.cookie = `X-Group-UUID=${groupId}`;
document.cookie = `auth_token=${authToken}`;
localStorage.setItem('authToken', authToken);

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
