import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询客户列表
export function listCustomer(query) {
  return request({
    url: '/beverage/customer/list',
    method: 'get',
    params: query
  })
}

// 查询客户详细
export function getCustomer(customerId) {
  return request({
    url: '/beverage/customer/' + parseStrEmpty(customerId),
    method: 'get'
  })
}

// 新增客户
export function addCustomer(data) {
  return request({
    url: '/beverage/customer',
    method: 'post',
    data: data
  })
}

// 修改客户
export function updateCustomer(data) {
  return request({
    url: '/beverage/customer',
    method: 'put',
    data: data
  })
}

// 删除客户
export function delCustomer(customerIds) {
  return request({
    url: '/beverage/customer/' + customerIds,
    method: 'delete'
  })
}
