import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询库存流水列表
export function listStock(query) {
  return request({
    url: '/beverage/stock/list',
    method: 'get',
    params: query
  })
}

// 查询库存流水详细
export function getStock(stockId) {
  return request({
    url: '/beverage/stock/' + parseStrEmpty(stockId),
    method: 'get'
  })
}

// 新增库存流水
export function addStock(data) {
  return request({
    url: '/beverage/stock',
    method: 'post',
    data: data
  })
}

// 修改库存流水
export function updateStock(data) {
  return request({
    url: '/beverage/stock',
    method: 'put',
    data: data
  })
}

// 删除库存流水
export function delStock(stockIds) {
  return request({
    url: '/beverage/stock/' + stockIds,
    method: 'delete'
  })
}
