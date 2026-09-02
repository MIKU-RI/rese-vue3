import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询销售出库单列表
export function listSale(query) {
  return request({
    url: '/beverage/sale/list',
    method: 'get',
    params: query
  })
}

// 查询销售出库单详细(含明细)
export function getSale(saleId) {
  return request({
    url: '/beverage/sale/' + parseStrEmpty(saleId),
    method: 'get'
  })
}

// 新增销售出库单
export function addSale(data) {
  return request({
    url: '/beverage/sale',
    method: 'post',
    data: data
  })
}

// 修改销售出库单
export function updateSale(data) {
  return request({
    url: '/beverage/sale',
    method: 'put',
    data: data
  })
}

// 删除销售出库单
export function delSale(saleIds) {
  return request({
    url: '/beverage/sale/' + saleIds,
    method: 'delete'
  })
}
