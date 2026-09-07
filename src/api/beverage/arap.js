import request from '@/utils/request'

// 应收汇总（按客户）
export function receivableList() {
  return request({
    url: '/beverage/arap/receivable',
    method: 'get'
  })
}

// 应付汇总（按供应商）
export function payableList() {
  return request({
    url: '/beverage/arap/payable',
    method: 'get'
  })
}
