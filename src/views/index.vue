<template>
  <div class="app-container home">
    <!-- 仪表盘标题与刷新 -->
    <div class="dash-header">
      <div class="dash-title">经营仪表盘</div>
      <el-button :loading="refreshing" icon="Refresh" @click="refresh">刷新数据</el-button>
    </div>

    <!-- 资金账目 -->
    <el-row :gutter="16">
      <el-col :xs="12" :sm="12" :md="6" :lg="6" v-for="acct in acctCards" :key="acct.label">
        <el-card shadow="hover" class="acct-card" @click="go(acct.path)">
          <div class="acct-label">
            {{ acct.label }}
            <el-icon class="acct-arrow"><ArrowRight /></el-icon>
          </div>
          <div class="acct-value" :style="{ color: acct.color }">{{ acct.value }}</div>
          <div class="acct-sub">{{ acct.sub }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- KPI 卡片 -->
    <el-row :gutter="16" class="mt16">
      <el-col :xs="12" :sm="12" :md="6" :lg="6" v-for="kpi in kpis" :key="kpi.label">
        <el-card shadow="hover" class="kpi-card">
          <div class="kpi-label">{{ kpi.label }}</div>
          <div class="kpi-value" :style="kpi.color ? { color: kpi.color } : null">{{ kpi.value }}</div>
          <div class="kpi-sub">{{ kpi.sub }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表第一行 -->
    <el-row :gutter="16" class="mt16">
      <el-col :xs="24" :sm="24" :md="12" :lg="12">
        <el-card shadow="hover">
          <template #header><span class="card-title">近 7 日进销趋势（净额 · 已扣退货）</span></template>
          <div ref="trendChart" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="12" :lg="12">
        <el-card shadow="hover">
          <template #header><span class="card-title">库存预警分布</span></template>
          <div ref="stockChart" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表第二行 -->
    <el-row :gutter="16" class="mt16">
      <el-col :xs="24" :sm="24" :md="12" :lg="12">
        <el-card shadow="hover">
          <template #header><span class="card-title">畅销饮料 Top 10</span></template>
          <div ref="topChart" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="12" :lg="12">
        <el-card shadow="hover">
          <template #header><span class="card-title">各品牌库存占比</span></template>
          <div class="cat-wrap">
            <div ref="catChart" class="cat-chart"></div>
            <div class="cat-list">
              <div v-if="!catRows.length" class="cat-empty">暂无品牌库存数据</div>
              <div v-for="d in catRows" :key="d.name" class="cat-row"
                   @mouseenter="hlCat(d.name, true)" @mouseleave="hlCat(d.name, false)">
                <span class="cat-dot" :style="{ background: d.color }"></span>
                <span class="cat-name" :title="d.name">{{ d.name }}</span>
                <span class="cat-qty">{{ fmtInt(d.value) }} 件</span>
                <span class="cat-pct">{{ d.pct }}%</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近收付款流水 -->
    <el-row :gutter="16" class="mt16">
      <el-col :span="24">
        <el-card shadow="hover" class="flow-card">
          <template #header>
            <div class="card-head">
              <span class="card-title">最近收付款流水</span>
              <el-button link type="primary" @click="go('/beverage/settlement')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentSettlements" size="small" empty-text="暂无收付款流水">
            <el-table-column label="类型" width="80" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.bizType === '1' ? 'success' : 'warning'" size="small">
                  {{ scope.row.bizType === '1' ? '收款' : '付款' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="往来单位" prop="counterpartyName" min-width="140" show-overflow-tooltip />
            <el-table-column label="关联单号" prop="relatedNo" min-width="150" show-overflow-tooltip />
            <el-table-column label="金额" width="130" align="right">
              <template #default="scope">
                <span :style="{ color: scope.row.bizType === '1' ? '#67C23A' : '#E6A23C', fontWeight: 600 }">
                  {{ (scope.row.bizType === '1' ? '+ ' : '- ') + fmtMoney(scope.row.amount) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="方式" width="90" align="center">
              <template #default="scope">{{ payMethodText(scope.row.payMethod) }}</template>
            </el-table-column>
            <el-table-column label="日期" prop="settleDate" width="110" align="center" />
            <el-table-column label="状态" width="80" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.status === '0' ? 'success' : 'info'" size="small">
                  {{ scope.row.status === '0' ? '正常' : '作废' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 低库存清单 -->
    <el-row :gutter="16" class="mt16">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <span class="card-title">
              低库存预警清单
              <el-tag type="danger" size="small" style="margin-left:8px">{{ lowStock.length }} 项</el-tag>
            </span>
          </template>
          <el-table :data="lowStock" size="small" border empty-text="暂无预警商品">
            <el-table-column label="商品名称" prop="productName" min-width="160" />
            <el-table-column label="当前库存" prop="stock" width="110" align="center" />
            <el-table-column label="预警阈值" prop="warnStock" width="110" align="center" />
            <el-table-column label="状态" width="100" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.stock <= 0 ? 'danger' : 'warning'" size="small">
                  {{ scope.row.stock <= 0 ? '缺货' : '预警' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Index">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { getDashboard } from '@/api/beverage/dashboard'
import { receivableList, payableList } from '@/api/beverage/arap'
import { listSettlement } from '@/api/beverage/settlement'

const router = useRouter()
const dashboard = ref({})
const refreshing = ref(false)
const lowStock = computed(() => dashboard.value.lowStock || [])
const arap = ref({ receivable: [], payable: [] })
const recentSettlements = ref([])

const PAY_METHODS = { '1': '现金', '2': '银行转账', '3': '微信', '4': '支付宝' }
function payMethodText(v) {
  return PAY_METHODS[v] || v || '-'
}

function go(path) {
  router.push(path)
}

function fmtMoney(v) {
  const n = Number(v || 0)
  return '¥ ' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtInt(v) {
  return (Number(v || 0)).toLocaleString('zh-CN')
}

// ---- 资金账目（净额口径：应收未收/应付未付 = 单据净额 − 已收付） ----
const arapSummary = computed(() => {
  const rec = arap.value.receivable || []
  const pay = arap.value.payable || []
  const sum = arr => arr.reduce((s, i) => s + Number(i.unpaid || 0), 0)
  const top = arr => arr.slice().sort((a, b) => Number(b.unpaid || 0) - Number(a.unpaid || 0))[0]
  const rt = rec.length ? top(rec) : null
  const pt = pay.length ? top(pay) : null
  return {
    receivableTotal: sum(rec),
    receivableDesc: rec.length ? rec.length + ' 家客户待收 · 最多 ' + rt.counterpartyName + ' ' + fmtMoney(rt.unpaid) : '暂无待收账款',
    payableTotal: sum(pay),
    payableDesc: pay.length ? pay.length + ' 家供应商待付 · 最多 ' + pt.counterpartyName + ' ' + fmtMoney(pt.unpaid) : '暂无待付账款'
  }
})

const acctCards = computed(() => {
  const k = dashboard.value.kpi || {}
  return [
    { label: '应收未收（净）', value: fmtMoney(arapSummary.value.receivableTotal), sub: arapSummary.value.receivableDesc, color: '#F56C6C', path: '/beverage/arap' },
    { label: '应付未付（净）', value: fmtMoney(arapSummary.value.payableTotal), sub: arapSummary.value.payableDesc, color: '#409EFF', path: '/beverage/arap' },
    { label: '待入库货款', value: fmtMoney(k.pendingPurchaseAmount), sub: '入库后计入累计进货额', color: '#E6A23C', path: '/beverage/purchase' },
    { label: '待出库货款', value: fmtMoney(k.pendingSaleAmount), sub: '待出库 ' + fmtInt(k.pendingSaleOrderCount) + ' 单 · 出库后计入销售额', color: '#E6A23C', path: '/beverage/sale' }
  ]
})

// 近 7 日趋势最后一位 = 今日净额
function trendLast(key) {
  const arr = (dashboard.value.trend || {})[key] || []
  return Number(arr.length ? arr[arr.length - 1] : 0)
}
function trendSum(key) {
  const arr = (dashboard.value.trend || {})[key] || []
  return arr.reduce((s, v) => s + Number(v || 0), 0)
}

const kpis = computed(() => {
  const k = dashboard.value.kpi || {}
  const profitColor = Number(k.profit || 0) < 0 ? '#F56C6C' : '#67C23A'
  const rateColor = Number(k.profitRate || 0) < 0 ? '#F56C6C' : '#67C23A'
  return [
    { label: '今日净销售', value: fmtMoney(trendLast('sale')), sub: '近 7 日 ' + fmtMoney(trendSum('sale')) },
    { label: '今日净进货', value: fmtMoney(trendLast('purchase')), sub: '近 7 日 ' + fmtMoney(trendSum('purchase')) },
    { label: '累计销售额', value: fmtMoney(k.saleTotalAmount), sub: '已出库 · 销售退货 ' + fmtMoney(k.saleReturnAmount) + ' · 待出库 ' + fmtMoney(k.pendingSaleAmount) },
    { label: '累计进货额', value: fmtMoney(k.purchaseTotalAmount), sub: '已入库 · 采购退货 ' + fmtMoney(k.purchaseReturnAmount) + ' · 待入库 ' + fmtMoney(k.pendingPurchaseAmount) },
    { label: '累计毛利', value: fmtMoney(k.profit), sub: '净销售额(扣销售退货) − 净进货额(扣采购退货)', color: profitColor },
    { label: '毛利率', value: (Number(k.profitRate || 0)).toFixed(2) + ' %', sub: '毛利 ÷ 净销售额', color: rateColor },
    { label: '客单价', value: fmtMoney(k.avgOrderValue), sub: '销售额 ÷ ' + (k.saleOrderCount || 0) + ' 单' },
    { label: '库存总量', value: fmtInt(k.stockTotalQty) + ' 件', sub: '覆盖 ' + (k.productTotal || 0) + ' 个 SKU · 低库存 ' + (k.lowStockTotal || 0) + ' 项' }
  ]
})

const trendChart = ref(null)
const stockChart = ref(null)
const topChart = ref(null)
const catChart = ref(null)
let charts = []

function renderTrend() {
  const t = dashboard.value.trend || { dates: [], purchase: [], sale: [] }
  const c = echarts.init(trendChart.value)
  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['净进货额', '净销售额'] },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: t.dates },
    yAxis: { type: 'value' },
    series: [
      { name: '净进货额', type: 'line', smooth: true, data: t.purchase, areaStyle: { opacity: 0.08 } },
      { name: '净销售额', type: 'line', smooth: true, data: t.sale, areaStyle: { opacity: 0.08 } }
    ]
  })
  return c
}

function renderStock() {
  const dist = dashboard.value.stockDist || []
  const c = echarts.init(stockChart.value)
  c.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '库存预警',
        type: 'pie',
        radius: ['40%', '65%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6 },
        label: { show: true, formatter: '{b}\n{d}%' },
        data: dist.map(d => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.name === '正常' ? '#67C23A' : d.name === '预警' ? '#E6A23C' : '#F56C6C' }
        }))
      }
    ]
  })
  return c
}

function renderTop() {
  const items = dashboard.value.topProducts || []
  const names = items.map(i => i.productName)
  const values = items.map(i => Number(i.totalQty || 0))
  const c = echarts.init(topChart.value)
  c.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 130, right: 30, top: 20, bottom: 20 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: names.slice().reverse() },
    series: [
      {
        type: 'bar',
        data: values.slice().reverse(),
        barWidth: '55%',
        itemStyle: { color: '#409EFF', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right' }
      }
    ]
  })
  return c
}

// ---- 品牌库存占比：Top 8 独立配色，其余合并「其他」，右侧榜单与扇区悬停联动 ----
const CAT_PALETTE = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#d4a5fb', '#e07b9a']
const CAT_TOP_N = 10
let catInstance = null

const catRows = computed(() => {
  const items = (dashboard.value.brandShare || [])
    .map(i => ({ name: i.name, value: Number(i.value || 0) }))
    .filter(i => i.value > 0)
  items.sort((a, b) => b.value - a.value)
  const total = items.reduce((s, i) => s + i.value, 0)
  if (!total) return []
  const rows = items.slice(0, CAT_TOP_N).map((i, idx) => ({
    ...i,
    pct: (i.value / total * 100).toFixed(1),
    color: CAT_PALETTE[idx % CAT_PALETTE.length]
  }))
  const restValue = items.slice(CAT_TOP_N).reduce((s, i) => s + i.value, 0)
  if (restValue > 0) {
    rows.push({ name: '其他', value: restValue, pct: (restValue / total * 100).toFixed(1), color: '#C0C4CC' })
  }
  return rows
})

function renderCat() {
  if (catInstance) { catInstance.dispose(); catInstance = null }
  const c = echarts.init(catChart.value)
  catInstance = c
  const totalQty = catRows.value.reduce((s, i) => s + i.value, 0)
  c.setOption({
    tooltip: {
      trigger: 'item',
      formatter: p => `${p.marker} ${p.name}<br/>库存 ${fmtInt(p.value)} 件（${p.percent}%）`
    },
    title: {
      text: '库存总量',
      subtext: fmtInt(totalQty) + ' 件',
      left: 'center',
      top: '40%',
      textStyle: { fontSize: 12, fontWeight: 400, color: '#909399' },
      subtextStyle: { fontSize: 18, fontWeight: 700, color: '#303133' }
    },
    series: [
      {
        name: '品牌库存占比',
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['50%', '50%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 6 },
        data: catRows.value.map(i => ({ name: i.name, value: i.value, itemStyle: { color: i.color } }))
      }
    ]
  })
  return c
}

function hlCat(name, on) {
  if (!catInstance) return
  catInstance.dispatchAction({ type: on ? 'highlight' : 'downplay', seriesName: '品牌库存占比', name })
}

function resizeAll() {
  charts.forEach(c => c && c.resize())
}

async function loadFinance() {
  try {
    const [rec, pay] = await Promise.all([receivableList(), payableList()])
    arap.value = { receivable: rec.data || [], payable: pay.data || [] }
  } catch (e) {
    console.error('加载往来账目失败', e)
  }
  try {
    const res = await listSettlement({ pageNum: 1, pageSize: 8, status: '0', orderByColumn: 'createTime', isAsc: 'desc' })
    recentSettlements.value = res.rows || []
  } catch (e) {
    console.error('加载最近流水失败', e)
  }
}

async function loadDashboard() {
  refreshing.value = true
  try {
    const res = await getDashboard()
    dashboard.value = res.data || {}
  } catch (e) {
    console.error('加载仪表盘失败', e)
  }
  await nextTick()
  charts = [renderTrend(), renderStock(), renderTop(), renderCat()]
  loadFinance()
  refreshing.value = false
}

function refresh() {
  loadDashboard()
}

onMounted(() => {
  loadDashboard()
  window.addEventListener('resize', resizeAll)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeAll)
  charts.forEach(c => c && c.dispose())
})
</script>

<style scoped lang="scss">
.home {
  background: transparent;
}
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.dash-title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}
.kpi-card {
  margin-bottom: 4px;
  .kpi-label {
    color: #909399;
    font-size: 13px;
  }
  .kpi-value {
    margin: 8px 0 4px;
    font-size: 26px;
    font-weight: 700;
    color: #303133;
  }
  .kpi-sub {
    font-size: 12px;
    color: #67c23a;
  }
}
.mt16 {
  margin-top: 16px;
}
.acct-card {
  cursor: pointer;
  transition: transform .15s ease;
}
.acct-card:hover {
  transform: translateY(-3px);
}
.acct-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #909399;
  font-size: 13px;
}
.acct-arrow {
  color: #c0c4cc;
  font-size: 14px;
}
.acct-card:hover .acct-arrow {
  color: #409eff;
}
.acct-value {
  margin: 8px 0 4px;
  font-size: 26px;
  font-weight: 700;
}
.acct-sub {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title {
  font-weight: 600;
}
.chart {
  width: 100%;
  height: 320px;
}
.cat-wrap {
  display: flex;
  align-items: stretch;
  height: 320px;
}
.cat-chart {
  flex: 1.15;
  min-width: 0;
  height: 100%;
}
.cat-list {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 6px 4px 6px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3.5px 8px;
  border-radius: 6px;
  transition: background .15s;
}
.cat-row:hover {
  background: #f5f7fa;
}
.cat-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex: none;
}
.cat-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cat-qty {
  flex: none;
  font-size: 12px;
  color: #909399;
}
.cat-pct {
  flex: none;
  width: 52px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  font-variant-numeric: tabular-nums;
}
.cat-empty {
  color: #909399;
  font-size: 13px;
  text-align: center;
  margin-top: 40px;
}
</style>
