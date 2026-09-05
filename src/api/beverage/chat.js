import request from '@/utils/request'

// 智能问答

/** 提问：传入自然语言问题，返回结构化答案（结论 + 统计卡 + 表格） */
export function askChat(question) {
  return request({
    url: '/beverage/chat/ask',
    method: 'post',
    data: { question }
  })
}

/** 能力清单（页面初始化引导） */
export function getChatHelp() {
  return request({
    url: '/beverage/chat/help',
    method: 'get'
  })
}
