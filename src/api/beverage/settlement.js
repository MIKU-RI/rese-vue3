import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 收付款流水列表
export function listSettlement(query) {
  return request({
    url: '/beverage/settlement/list',
    method: 'get',
    params: query
  })
}

// 收付款单详情
export function getSettlement(id) {
  return request({
    url: '/beverage/settlement/' + parseStrEmpty(id),
    method: 'get'
  })
}

// 登记收付款
export function addSettlement(data) {
  return request({
    url: '/beverage/settlement',
    method: 'post',
    data: data
  })
}

// 作废收付款（回滚关联单据）
export function delSettlement(ids) {
  return request({
    url: '/beverage/settlement/' + ids,
    method: 'delete'
  })
}

// 一键结清（已收/已付）：按剩余金额创建流水并标记单据已结
// data: { bizType: '1'收款/'2'付款, relatedId, payMethod, remark }
export function settleInFull(data) {
  return request({
    url: '/beverage/settlement/settleInFull',
    method: 'post',
    data: data
  })
}
