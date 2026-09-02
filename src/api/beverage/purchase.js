import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询采购进货单列表
export function listPurchase(query) {
  return request({
    url: '/beverage/purchase/list',
    method: 'get',
    params: query
  })
}

// 查询采购进货单详细(含明细)
export function getPurchase(purchaseId) {
  return request({
    url: '/beverage/purchase/' + parseStrEmpty(purchaseId),
    method: 'get'
  })
}

// 新增采购进货单
export function addPurchase(data) {
  return request({
    url: '/beverage/purchase',
    method: 'post',
    data: data
  })
}

// 修改采购进货单
export function updatePurchase(data) {
  return request({
    url: '/beverage/purchase',
    method: 'put',
    data: data
  })
}

// 删除采购进货单
export function delPurchase(purchaseIds) {
  return request({
    url: '/beverage/purchase/' + purchaseIds,
    method: 'delete'
  })
}
