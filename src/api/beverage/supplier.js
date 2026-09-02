import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询供应商列表
export function listSupplier(query) {
  return request({
    url: '/beverage/supplier/list',
    method: 'get',
    params: query
  })
}

// 查询供应商详细
export function getSupplier(supplierId) {
  return request({
    url: '/beverage/supplier/' + parseStrEmpty(supplierId),
    method: 'get'
  })
}

// 新增供应商
export function addSupplier(data) {
  return request({
    url: '/beverage/supplier',
    method: 'post',
    data: data
  })
}

// 修改供应商
export function updateSupplier(data) {
  return request({
    url: '/beverage/supplier',
    method: 'put',
    data: data
  })
}

// 删除供应商
export function delSupplier(supplierIds) {
  return request({
    url: '/beverage/supplier/' + supplierIds,
    method: 'delete'
  })
}
