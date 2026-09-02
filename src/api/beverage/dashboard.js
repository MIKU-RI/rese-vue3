import request from '@/utils/request'

// 经营仪表盘统计数据
export function getDashboard() {
  return request({
    url: '/beverage/dashboard',
    method: 'get'
  })
}
