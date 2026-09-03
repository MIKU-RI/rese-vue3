import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询退货单列表
export function listReturn(query) {
  return request({
    url: '/beverage/return/list',
    method: 'get',
    params: query
  })
}

// 查询退货单详细(含明细)
export function getReturn(returnId) {
  return request({
    url: '/beverage/return/' + parseStrEmpty(returnId),
    method: 'get'
  })
}

// 新增退货单
export function addReturn(data) {
  return request({
    url: '/beverage/return',
    method: 'post',
    data: data
  })
}

// 修改退货单
export function updateReturn(data) {
  return request({
    url: '/beverage/return',
    method: 'put',
    data: data
  })
}

// 删除退货单
export function delReturn(returnIds) {
  return request({
    url: '/beverage/return/' + returnIds,
    method: 'delete'
  })
}

// 从采购/销售原单一键自动创建退货单
export function autoCreateReturn(data) {
  return request({
    url: '/beverage/return/autoFromSource',
    method: 'post',
    data: data
  })
}
