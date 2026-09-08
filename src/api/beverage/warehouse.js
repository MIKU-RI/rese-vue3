import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询仓库列表
export function listWarehouse(query) {
  return request({
    url: '/beverage/warehouse/list',
    method: 'get',
    params: query
  })
}

// 查询全部可用仓库（下拉用，不分页）
export function warehouseOptions() {
  return request({
    url: '/beverage/warehouse/options',
    method: 'get'
  })
}

// 查询仓库详细
export function getWarehouse(warehouseId) {
  return request({
    url: '/beverage/warehouse/' + parseStrEmpty(warehouseId),
    method: 'get'
  })
}

// 新增仓库
export function addWarehouse(data) {
  return request({
    url: '/beverage/warehouse',
    method: 'post',
    data: data
  })
}

// 修改仓库
export function updateWarehouse(data) {
  return request({
    url: '/beverage/warehouse',
    method: 'put',
    data: data
  })
}

// 删除仓库
export function delWarehouse(warehouseIds) {
  return request({
    url: '/beverage/warehouse/' + warehouseIds,
    method: 'delete'
  })
}
