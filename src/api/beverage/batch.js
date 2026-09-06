import request from '@/utils/request'

// 查询商品批次列表（含临期/过期状态，支持 productId/productName/batchNo/expiryStatus 过滤）
export function listBatch(query) {
  return request({
    url: '/beverage/batch/list',
    method: 'get',
    params: query
  })
}
