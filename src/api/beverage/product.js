import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/ruoyi";

// 查询饮料商品列表
export function listProduct(query) {
  return request({
    url: '/beverage/product/list',
    method: 'get',
    params: query
  })
}

// 查询饮料商品详细
export function getProduct(productId) {
  return request({
    url: '/beverage/product/' + parseStrEmpty(productId),
    method: 'get'
  })
}

// 新增饮料商品
export function addProduct(data) {
  return request({
    url: '/beverage/product',
    method: 'post',
    data: data
  })
}

// 修改饮料商品
export function updateProduct(data) {
  return request({
    url: '/beverage/product',
    method: 'put',
    data: data
  })
}

// 品牌维度价格统计（品牌调价首页）
export function listBrandStats() {
  return request({
    url: '/beverage/product/brandStats',
    method: 'get'
  })
}

// 按品牌查询商品（品牌调价明细）
export function listBrandProducts(brand) {
  return request({
    url: '/beverage/product/brandProducts',
    method: 'get',
    params: { brand }
  })
}

// 批量保存商品单价（品牌调价）
export function updateBrandPrice(data) {
  return request({
    url: '/beverage/product/brandPrice',
    method: 'put',
    data: data
  })
}

// 批量保存商品库存（库存调整，生成库存台账记录，仅超管）
export function updateProductStock(data) {
  return request({
    url: '/beverage/product/stock',
    method: 'put',
    data: data
  })
}

// 删除饮料商品
export function delProduct(productIds) {
  return request({
    url: '/beverage/product/' + productIds,
    method: 'delete'
  })
}
