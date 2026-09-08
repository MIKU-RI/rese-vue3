import request from '@/utils/request'

// 查询商品批次列表（含临期/过期状态，支持 productId/productName/batchNo/expiryStatus 过滤）
export function listBatch(query) {
  return request({
    url: '/beverage/batch/list',
    method: 'get',
    params: query
  })
}

// 新增批次入库（超管专属）：同一批次号/生产日期/保质期下批量录入多个商品的入库数量
// data: { batchNo, productionDate, expiryDate, remark, items: [{ productId, qty }] }
export function createBatchInbound(data) {
  return request({
    url: '/beverage/batch/createInbound',
    method: 'post',
    data
  })
}

