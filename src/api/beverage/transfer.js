import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询调拨单列表
export function listTransfer(query) {
  return request({
    url: '/beverage/transfer/list',
    method: 'get',
    params: query
  })
}

// 查询调拨单详细(含明细)
export function getTransfer(transferId) {
  return request({
    url: '/beverage/transfer/' + parseStrEmpty(transferId),
    method: 'get'
  })
}

// 新增调拨单（status=0 待调拨；超管可直存 status=1 已调拨并立即执行）
export function addTransfer(data) {
  return request({
    url: '/beverage/transfer',
    method: 'post',
    data: data
  })
}

// 修改 / 执行调拨 / 撤销调拨（均通过 status 翻转驱动：0→1 执行，1→0 撤销回滚）
export function updateTransfer(data) {
  return request({
    url: '/beverage/transfer',
    method: 'put',
    data: data
  })
}

// 删除调拨单
export function delTransfer(transferIds) {
  return request({
    url: '/beverage/transfer/' + transferIds,
    method: 'delete'
  })
}
