import request from '@/utils/request'

// 查询仓库库存列表（可按仓库/商品/品牌过滤）
export function listInventory(query) {
  return request({
    url: '/beverage/inventory/list',
    method: 'get',
    params: query
  })
}

// 查询某商品在各仓的库存分布
export function inventoryByProduct(productId) {
  return request({
    url: '/beverage/inventory/byProduct/' + productId,
    method: 'get'
  })
}
