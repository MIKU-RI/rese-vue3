<template>
  <div class="app-container chat-page">
    <div class="chat-panel">
      <div class="chat-header">
        <span class="hd-title"><el-icon><ChatDotRound /></el-icon> 智能问答</span>
        <span class="hd-sub">直接提问即可查询库存与每日交易流水</span>
        <el-button class="hd-clear" link type="info" icon="Delete" @click="clearChat">清空会话</el-button>
      </div>

      <div class="chat-body" ref="bodyRef">
        <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
          <div class="avatar">{{ m.role === 'user' ? '我' : 'AI' }}</div>
          <div class="bubble">
            <div v-if="m.role === 'bot' && m.data && m.data.intentLabel" class="intent-tag">{{ m.data.intentLabel }}</div>
            <div class="answer-text">{{ m.text }}</div>

            <!-- 统计卡 -->
            <div v-if="m.data && m.data.stats && m.data.stats.length" class="stat-row">
              <div v-for="(s, si) in m.data.stats" :key="si" class="stat-card" :class="'c-' + s.color">
                <div class="s-label">{{ s.label }}</div>
                <div class="s-value">{{ s.value }}<i v-if="s.unit">{{ s.unit }}</i></div>
              </div>
            </div>

            <!-- 结果表格 -->
            <el-table v-if="m.data && m.data.rows && m.data.rows.length" :data="m.data.rows" size="small"
                      class="res-table" max-height="320" border stripe>
              <el-table-column v-for="c in m.data.columns" :key="c.prop" :prop="c.prop" :label="c.label"
                               :width="c.width" :align="c.align || 'center'" :show-overflow-tooltip="true">
                <template #default="sc">
                  <span v-if="c.prop === 'stock' && sc.row._warn === '1'" class="danger-text">{{ sc.row[c.prop] }}</span>
                  <span v-else-if="c.prop === 'statusText'" :class="sc.row[c.prop] === '已处理' ? 'ok-text' : 'wait-text'">
                    {{ sc.row[c.prop] }}
                  </span>
                  <span v-else>{{ sc.row[c.prop] }}</span>
                </template>
              </el-table-column>
            </el-table>

            <!-- 追问建议 -->
            <div v-if="m.data && m.data.tips && m.data.tips.length" class="tip-row">
              <el-button v-for="t in m.data.tips" :key="t" size="small" text type="primary" @click="ask(t)">{{ t }}</el-button>
            </div>
          </div>
        </div>

        <div v-if="loading" class="msg bot">
          <div class="avatar">AI</div>
          <div class="bubble typing"><i></i><i></i><i></i> 正在查询…</div>
        </div>
      </div>

      <div class="chat-footer">
        <div class="quick-row">
          <el-button v-for="q in quickQuestions" :key="q" size="small" round @click="ask(q)">{{ q }}</el-button>
        </div>
        <div class="input-row">
          <el-input v-model="input" placeholder="例如：今天卖了多少？哪些商品需要补货？可乐还有多少库存？"
                    clearable @keyup.enter="send" />
          <el-button type="primary" icon="Promotion" :disabled="!input.trim() || loading" @click="send">发送</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup name="BeverageChat">
import { askChat, getChatHelp } from "@/api/beverage/chat"

const { proxy } = getCurrentInstance()

const messages = ref([])
const input = ref("")
const loading = ref(false)
const bodyRef = ref(null)

const quickQuestions = ref([
  "今天卖了多少？",
  "今天的销售流水",
  "今天进了多少货？",
  "哪些商品需要补货？",
  "可乐还有多少库存？",
  "今天赚了多少？",
  "本周经营概况",
  "最近卖得最好的商品"
])

function scrollBottom() {
  nextTick(() => {
    if (bodyRef.value) {
      bodyRef.value.scrollTop = bodyRef.value.scrollHeight
    }
  })
}

function pushBot(data) {
  messages.value.push({
    role: "bot",
    text: data.answer,
    data: data
  })
  scrollBottom()
}

function ask(q) {
  if (!q) return
  input.value = ""
  messages.value.push({ role: "user", text: q })
  scrollBottom()
  loading.value = true
  askChat(q).then(res => {
    pushBot(res.data || {})
  }).catch(() => {
    messages.value.push({ role: "bot", text: "查询失败，请稍后重试或换个问法。", data: null })
    scrollBottom()
  }).finally(() => {
    loading.value = false
  })
}

function send() {
  const q = input.value.trim()
  if (!q) return
  ask(q)
}

function clearChat() {
  messages.value = []
  loadHelp()
}

function loadHelp() {
  getChatHelp().then(res => {
    pushBot(res.data || {})
  }).catch(() => {
    pushBot({ answer: "我可以回答库存与交易流水相关问题，直接提问即可。", intentLabel: "能力说明" })
  })
}

onMounted(() => {
  loadHelp()
})
</script>

<style scoped lang="scss">
.chat-page { padding: 12px 14px; height: calc(100vh - 84px); box-sizing: border-box; }
.chat-panel {
  height: 100%; display: flex; flex-direction: column;
  border: 1px solid var(--el-border-color-lighter); border-radius: 8px;
  background: var(--el-bg-color); overflow: hidden;
}

.chat-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-light);
}
.hd-title { font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; }
.hd-title .el-icon { margin-right: 5px; }
.hd-sub { font-size: 12px; color: var(--el-text-color-secondary); }
.hd-clear { margin-left: auto; }

.chat-body { flex: 1; overflow-y: auto; padding: 14px; }

.msg { display: flex; gap: 8px; margin-bottom: 14px; align-items: flex-start; }
.msg.user { flex-direction: row-reverse; }
.avatar {
  flex: 0 0 30px; height: 30px; border-radius: 6px; line-height: 30px; text-align: center;
  font-size: 12px; font-weight: 600; color: #fff; background: var(--el-color-primary);
}
.msg.user .avatar { background: var(--el-color-info); }

.bubble {
  max-width: 78%; padding: 9px 12px; border-radius: 8px; font-size: 13px; line-height: 1.6;
  background: var(--el-fill-color-light); color: var(--el-text-color-primary);
  border: 1px solid var(--el-border-color-lighter);
}
.msg.user .bubble { background: var(--el-color-primary-light-9); border-color: var(--el-color-primary-light-7); }

.intent-tag {
  display: inline-block; font-size: 11px; padding: 1px 7px; border-radius: 3px; margin-bottom: 5px;
  background: var(--el-color-primary-light-9); color: var(--el-color-primary);
}
.answer-text { white-space: pre-wrap; word-break: break-word; }

.stat-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 9px; }
.stat-card {
  min-width: 96px; padding: 6px 10px; border-radius: 6px;
  background: var(--el-fill-color); border: 1px solid var(--el-border-color-lighter);
}
.s-label { font-size: 11px; color: var(--el-text-color-secondary); }
.s-value { font-size: 16px; font-weight: 700; margin-top: 2px; }
.s-value i { font-style: normal; font-size: 11px; font-weight: normal; margin-left: 2px; color: var(--el-text-color-secondary); }
.stat-card.c-success .s-value { color: #67C23A; }
.stat-card.c-danger .s-value { color: #F56C6C; }
.stat-card.c-warning .s-value { color: #E6A23C; }
.stat-card.c-primary .s-value { color: var(--el-color-primary); }
.stat-card.c-info .s-value { color: var(--el-text-color-secondary); }

.res-table { margin-top: 10px; width: 100%; font-size: 12px; }
.danger-text { color: #F56C6C; font-weight: 700; }
.ok-text { color: #67C23A; }
.wait-text { color: #E6A23C; }

.tip-row { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 2px; }

.typing { color: var(--el-text-color-secondary); }
.typing i {
  display: inline-block; width: 5px; height: 5px; margin-right: 3px; border-radius: 50%;
  background: var(--el-text-color-secondary); animation: blink 1.2s infinite;
}
.typing i:nth-child(2) { animation-delay: .2s; }
.typing i:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }

.chat-footer { border-top: 1px solid var(--el-border-color-lighter); padding: 9px 12px; background: var(--el-fill-color-blank); }
.quick-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.input-row { display: flex; gap: 8px; }
</style>
