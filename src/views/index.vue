<template>
  <div class="app-container home">
    <!-- KPI 卡片 -->
    <el-row :gutter="16">
      <el-col :xs="12" :sm="12" :md="6" :lg="6" v-for="kpi in kpis" :key="kpi.label">
        <el-card shadow="hover" class="kpi-card">
          <div class="kpi-label">{{ kpi.label }}</div>
          <div class="kpi-value" :style="kpi.color ? { color: kpi.color } : null">{{ kpi.value }}</div>
          <div class="kpi-sub">{{ kpi.sub }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 模块快捷入口 -->
    <el-row :gutter="16" class="mt16">
      <el-col :xs="12" :sm="8" :md="4" v-for="m in quickLinks" :key="m.path">
        <el-card shadow="hover" class="quick-card" @click="go(m.path)">
          <el-icon class="quick-icon" :style="{ color: m.color }"><component :is="m.icon" /></el-icon>
          <div class="quick-label">{{ m.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表第一行 -->
    <el-row :gutter="16" class="mt16">
      <el-col :xs="24" :sm="24" :md="12" :lg="12">
        <el-card shadow="hover">
          <template #header><span class="card-title">近 7 日进销趋势</span></template>
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
          <div ref="catChart" class="chart"></div>
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
import { getDashboard } from '@/api/beverage/dashboard'

const router = useRouter()
const dashboard = ref({})
const lowStock = computed(() => dashboard.value.lowStock || [])

const quickLinks = ref([
  { label: '商品管理', path: '/beverage/product', icon: 'Goods', color: '#409EFF' },
  { label: '供应商', path: '/beverage/supplier', icon: 'OfficeBuilding', color: '#67C23A' },
  { label: '客户门店', path: '/beverage/customer', icon: 'Shop', color: '#E6A23C' },
  { label: '库存台账', path: '/beverage/stock', icon: 'Box', color: '#909399' },
  { label: '采购进货', path: '/beverage/purchase', icon: 'ShoppingCart', color: '#F56C6C' },
  { label: '销售出库', path: '/beverage/sale', icon: 'Sell', color: '#9254DE' }
])

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

const kpis = computed(() => {
  const k = dashboard.value.kpi || {}
  const profitColor = Number(k.profit || 0) < 0 ? '#F56C6C' : '#67C23A'
  const rateColor = Number(k.profitRate || 0) < 0 ? '#F56C6C' : '#67C23A'
  return [
    { label: '商品种类', value: fmtInt(k.productTotal), sub: '低库存 ' + (k.lowStockTotal || 0) + ' 项待补货' },
    { label: '库存总量', value: fmtInt(k.stockTotalQty) + ' 件', sub: '覆盖 ' + (k.productTotal || 0) + ' 个 SKU' },
    { label: '累计进货额', value: fmtMoney(k.purchaseTotalAmount), sub: '已入库 · 采购退货 ' + fmtMoney(k.purchaseReturnAmount) + ' · 待入库 ' + fmtMoney(k.pendingPurchaseAmount) },
    { label: '累计销售额', value: fmtMoney(k.saleTotalAmount), sub: '已出库 · 销售退货 ' + fmtMoney(k.saleReturnAmount) + ' · 待出库 ' + fmtMoney(k.pendingSaleAmount) },
    { label: '累计毛利', value: fmtMoney(k.profit), sub: '净销售额(扣销售退货) − 净进货额(扣采购退货)', color: profitColor },
    { label: '毛利率', value: (Number(k.profitRate || 0)).toFixed(2) + ' %', sub: '毛利 ÷ 净销售额', color: rateColor },
    { label: '客单价', value: fmtMoney(k.avgOrderValue), sub: '销售额 ÷ ' + (k.saleOrderCount || 0) + ' 单' },
    { label: '销售单数', value: fmtInt(k.saleOrderCount), sub: '已出库 · 待出库 ' + fmtInt(k.pendingSaleOrderCount) + ' 单' }
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
    legend: { data: ['进货额', '销售额'] },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: t.dates },
    yAxis: { type: 'value' },
    series: [
      { name: '进货额', type: 'line', smooth: true, data: t.purchase, areaStyle: { opacity: 0.08 } },
      { name: '销售额', type: 'line', smooth: true, data: t.sale, areaStyle: { opacity: 0.08 } }
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

function renderCat() {
  const items = dashboard.value.brandShare || []
  const c = echarts.init(catChart.value)
  c.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '品牌库存占比',
        type: 'pie',
        radius: ['40%', '65%'],
        itemStyle: { borderRadius: 6 },
        label: { show: true, formatter: '{b}\n{d}%' },
        data: items.map(i => ({ name: i.name, value: Number(i.value || 0) }))
      }
    ]
  })
  return c
}

function resizeAll() {
  charts.forEach(c => c && c.resize())
}

async function loadDashboard() {
  try {
    const res = await getDashboard()
    dashboard.value = res.data || {}
  } catch (e) {
    console.error('加载仪表盘失败', e)
  }
  await nextTick()
  charts = [renderTrend(), renderStock(), renderTop(), renderCat()]
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
.quick-card {
  cursor: pointer;
  text-align: center;
  transition: transform .15s ease;
}
.quick-card:hover {
  transform: translateY(-3px);
}
.quick-icon {
  font-size: 26px;
  margin-bottom: 6px;
}
.quick-label {
  font-size: 13px;
  color: #606266;
}
.card-title {
  font-weight: 600;
}
.chart {
  width: 100%;
  height: 320px;
}
</style>
