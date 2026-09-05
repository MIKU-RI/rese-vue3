<template>
  <div class="app-container bp">
    <!-- ============ 视图一：品牌列表（不直接展示商品） ============ -->
    <div v-if="view === 'brand'">
      <el-card shadow="never" class="bp-toolbar">
        <div class="bp-toolbar__row">
          <el-input
            v-model="brandKeyword"
            placeholder="搜索品牌"
            clearable
            style="width: 220px"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-checkbox v-model="onlyWithProduct" class="bp-toolbar__chk">只看有商品的品牌</el-checkbox>
          <div class="bp-toolbar__right">
            <el-button icon="Refresh" @click="loadBrands">刷新</el-button>
          </div>
        </div>
        <div class="bp-tip">
          按品牌统一管理库存：点击品牌卡片进入该品牌的库存表，可单个修改或批量调整。每次保存都会为发生变动的商品生成一条「盘点」库存台账记录。品牌在「系统管理 → 字典管理 → 饮料品牌」中维护。本功能仅超管可用。
        </div>
      </el-card>

      <div v-loading="brandLoading" class="bp-grid">
        <div
          v-for="b in filteredBrands"
          :key="b.brand"
          class="bp-card"
          @click="openBrand(b)"
        >
          <div class="bp-card__head">
            <span class="bp-card__dot" :style="{ background: brandColor(b.brand) }"></span>
            <span class="bp-card__name" :title="b.brand">{{ b.brand }}</span>
            <span class="bp-card__count">{{ b.productCount }} 款</span>
          </div>
          <div class="bp-card__body">
            <div class="bp-card__line">
              <span class="bp-label">总库存</span>
              <span v-if="b.productCount" class="bp-value">{{ Number(b.totalStock) || 0 }} 件</span>
              <span v-else class="bp-value bp-value--empty">暂无商品</span>
            </div>
            <div class="bp-card__line">
              <span class="bp-label">低库存</span>
              <span v-if="b.productCount" :class="['bp-value', Number(b.lowStockCount) > 0 ? 'bp-value--danger' : 'bp-value--good']">
                {{ Number(b.lowStockCount) || 0 }} 款预警
              </span>
              <span v-else class="bp-value bp-value--empty">—</span>
            </div>
            <div class="bp-card__line">
              <span class="bp-label">在售</span>
              <span v-if="b.productCount" class="bp-value">{{ b.onSaleCount }} / {{ b.productCount }}</span>
              <span v-else class="bp-value bp-value--empty">—</span>
            </div>
          </div>
          <div class="bp-card__foot">
            <span class="bp-card__onsale">库存预警 {{ b.lowStockCount || 0 }}</span>
            <span class="bp-card__enter">进入调库存 <el-icon><ArrowRight /></el-icon></span>
          </div>
        </div>

        <div v-if="!brandLoading && filteredBrands.length === 0" class="bp-empty">
          <el-empty description="没有匹配的品牌" />
        </div>
      </div>
    </div>

    <!-- ============ 视图二：某品牌的库存管理 ============ -->
    <div v-else>
      <el-card shadow="never" class="bp-toolbar">
        <div class="bp-toolbar__row">
          <el-button icon="ArrowLeft" @click="backToBrands">品牌列表</el-button>
          <span class="bp-crumb">
            <span class="bp-crumb__dot" :style="{ background: brandColor(currentBrand) }"></span>
            {{ currentBrand }}
            <el-tag size="small" type="info">{{ rows.length }} 款商品</el-tag>
          </span>
          <div class="bp-toolbar__right">
            <el-checkbox v-model="onlyOnSale" class="bp-toolbar__chk">只看在售</el-checkbox>
            <el-checkbox v-model="onlyLow" class="bp-toolbar__chk">只看预警</el-checkbox>
            <el-button icon="Refresh" @click="loadProducts">重置</el-button>
            <el-button type="warning" plain icon="EditPen" :disabled="!hasStockPerm" @click="openBatch">批量调整</el-button>
            <el-button type="primary" icon="Check" :disabled="!hasStockPerm" @click="submitStock">保存</el-button>
          </div>
        </div>
      </el-card>

      <el-table
        v-loading="tableLoading"
        :data="viewRows"
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column label="商品" min-width="200">
          <template #default="scope">
            <div class="bp-pname">{{ scope.row.productName }}</div>
            <div class="bp-pspec">{{ scope.row.spec }} · {{ scope.row.barcode || '无条码' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="单位" prop="unit" width="70" align="center" />
        <el-table-column label="当前库存" width="100" align="center">
          <template #default="scope">
            <span :class="isLow(scope.row) ? 'bp-value--danger' : ''">{{ scope.row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column label="预警阈值" width="90" align="center">
          <template #default="scope">{{ scope.row.warnStock || 0 }}</template>
        </el-table-column>
        <el-table-column label="调整后库存" width="160" align="center">
          <template #default="scope">
            <el-input-number
              v-model="scope.row.newStock"
              :min="0"
              :step="1"
              :precision="0"
              :controls-position="'right'"
              :disabled="!hasStockPerm"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="本次变动" width="110" align="center">
          <template #default="scope">
            <span :class="delta(scope.row) > 0 ? 'bp-value--good' : delta(scope.row) < 0 ? 'bp-value--danger' : 'bp-muted'">
              {{ delta(scope.row) > 0 ? '+' : '' }}{{ delta(scope.row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === '0' ? 'success' : 'info'" size="small">
              {{ scope.row.status === '0' ? '在售' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变更" width="90" align="center">
          <template #default="scope">
            <el-tag v-if="isDirty(scope.row)" type="warning" size="small">已修改</el-tag>
            <span v-else class="bp-muted">—</span>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!tableLoading && viewRows.length === 0" class="bp-empty">
        <el-empty :description="currentBrand + ' 下暂无商品'" />
      </div>
    </div>

    <!-- ============ 批量调整库存弹窗 ============ -->
    <el-dialog title="批量调整库存" v-model="batchOpen" width="560px" append-to-body>
      <el-form :model="batch" label-width="96px">
        <el-form-item label="作用范围">
          <el-radio-group v-model="batch.scope">
            <el-radio value="all">本品牌全部（{{ rows.length }} 款）</el-radio>
            <el-radio value="selected">选中商品（{{ selected.length }} 款）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="调整方式">
          <el-radio-group v-model="batch.mode">
            <el-radio value="delta">固定数量增减</el-radio>
            <el-radio value="fixed">统一设为</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="valueLabel">
          <el-input-number v-model="batch.value" :precision="0" :min="0" :step="1" style="width: 200px" />
          <span class="bp-unit">{{ valueUnit }}</span>
          <div class="bp-hint">{{ valueHint }}</div>
        </el-form-item>
        <el-form-item label="预览">
          <div class="bp-preview">
            <div>影响商品：<b>{{ batchTargets.length }}</b> 款</div>
            <div v-if="previewSample" class="bp-preview__sample">
              示例：{{ previewSample.name }} —— {{ previewSample.fromText }} → <b>{{ previewSample.toText }}</b>
            </div>
            <div v-else class="bp-preview__sample bp-muted">请先选择作用范围与商品</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="applyBatch">确 定</el-button>
          <el-button @click="batchOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="BeverageBrandStock">
import { listBrandStats, listBrandProducts, updateProductStock } from "@/api/beverage/product"
import { useDict } from "@/utils/dict"
import useUserStore from "@/store/modules/user"

const { proxy } = getCurrentInstance()
const route = useRoute()

// 品牌字典（含尚未录入商品的品牌）
const { beverage_brand } = useDict('beverage_brand')
// 是否可调整库存：仅超管（*:*:* 或 beverage:product:stock）
const hasStockPerm = computed(() => {
  const perms = useUserStore().permissions || []
  return perms.some(p => p === '*:*:*' || p === 'beverage:product:stock')
})

/* ---------------- 品牌列表 ---------------- */
const view = ref('brand')            // 'brand' | 'stock'
const brandLoading = ref(false)
const tableLoading = ref(false)
const statsList = ref([])            // 后端统计（有商品的品牌）
const brandKeyword = ref('')
const onlyWithProduct = ref(true)

const brandPalette = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#9254DE', '#13C2C2', '#EB2F96']
function brandColor(name) {
  if (!name) return '#909399'
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return brandPalette[h % brandPalette.length]
}
function isLow(p) {
  return p && Number(p.warnStock) > 0 && Number(p.stock) <= Number(p.warnStock)
}

const allBrands = computed(() => {
  const map = {}
  statsList.value.forEach(s => { map[s.brand] = { ...s } })
  ;(beverage_brand.value || []).forEach(o => {
    if (!map[o.value]) {
      map[o.value] = {
        brand: o.value,
        productCount: 0,
        onSaleCount: 0,
        totalStock: 0,
        lowStockCount: 0
      }
    }
  })
  return Object.keys(map).sort().map(k => map[k])
})

const filteredBrands = computed(() => {
  const k = (brandKeyword.value || '').trim().toLowerCase()
  return allBrands.value.filter(b => {
    if (onlyWithProduct.value && !b.productCount) return false
    if (k && !(b.brand || '').toLowerCase().includes(k)) return false
    return true
  })
})

function loadBrands() {
  brandLoading.value = true
  listBrandStats().then(res => {
    statsList.value = res.data || []
    brandLoading.value = false
  }).catch(() => { brandLoading.value = false })
}

/* ---------------- 品牌库存表 ---------------- */
const currentBrand = ref('')
const rows = ref([])
const selected = ref([])
const onlyOnSale = ref(false)
const onlyLow = ref(false)

const viewRows = computed(() => {
  return rows.value.filter(r => {
    if (onlyOnSale.value && r.status !== '0') return false
    if (onlyLow.value && !isLow(r)) return false
    return true
  })
})

function delta(row) {
  return Number(row.newStock) - Number(row.stock)
}
function isDirty(row) {
  return Number(row.newStock) !== Number(row.stock)
}

function openBrand(b) {
  currentBrand.value = b.brand
  view.value = 'stock'
  loadProducts()
}
function backToBrands() {
  view.value = 'brand'
  currentBrand.value = ''
  rows.value = []
  selected.value = []
  loadBrands()
}
function loadProducts() {
  if (!currentBrand.value) return
  tableLoading.value = true
  listBrandProducts(currentBrand.value).then(res => {
    rows.value = (res.data || []).map(p => ({
      ...p,
      stock: Number(p.stock) || 0,
      newStock: Number(p.stock) || 0
    }))
    tableLoading.value = false
  }).catch(() => { tableLoading.value = false })
}

function handleSelectionChange(selection) {
  selected.value = selection
}

function submitStock() {
  const changed = rows.value.filter(r => isDirty(r))
  if (changed.length === 0) {
    proxy.$modal.msgWarning('库存没有变化')
    return
  }
  const bad = changed.find(r => Number(r.newStock) < 0)
  if (bad) {
    proxy.$modal.msgError('库存不能为负数：' + bad.productName)
    return
  }
  const loss = changed.filter(r => Number(r.newStock) < Number(r.stock))
  const tip = loss.length
    ? '其中 ' + loss.length + ' 款商品库存将减少，系统会按变动量生成盘点台账记录，确认保存？'
    : '确认保存 ' + changed.length + ' 款商品的库存？系统会为每处变动生成一条盘点台账记录。'
  proxy.$modal.confirm(tip).then(() => {
    return updateProductStock(changed.map(r => ({
      productId: r.productId,
      stock: r.newStock
    })))
  }).then(() => {
    proxy.$modal.msgSuccess('已保存 ' + changed.length + ' 款商品库存并生成台账记录')
    loadProducts()
    loadBrands()
  }).catch(() => {})
}

/* ---------------- 批量调整库存 ---------------- */
const batchOpen = ref(false)
const batch = reactive({
  scope: 'all',
  mode: 'delta',
  value: 10
})

const batchTargets = computed(() => batch.scope === 'selected' ? selected.value : rows.value)

const valueLabel = computed(() => batch.mode === 'fixed' ? '目标库存' : '调整数量')
const valueUnit = computed(() => batch.mode === 'fixed' ? '件' : '件')
const valueHint = computed(() => batch.mode === 'fixed'
  ? '把库存直接设为该数值（低于 0 自动取 0）'
  : '正数为增加库存，负数为减少库存')

function calcNew(row) {
  const oldVal = Number(row.stock) || 0
  const v = Number(batch.value) || 0
  let nv = oldVal
  if (batch.mode === 'delta') nv = oldVal + v
  else if (batch.mode === 'fixed') nv = v
  if (nv < 0) nv = 0
  return Math.round(nv)
}

const previewSample = computed(() => {
  const list = batchTargets.value
  if (!list || list.length === 0) return null
  const row = list[0]
  return {
    name: row.productName,
    fromText: String(row.stock),
    toText: String(calcNew(row))
  }
})

function openBatch() {
  if (rows.value.length === 0) {
    proxy.$modal.msgWarning('当前品牌没有商品')
    return
  }
  batch.scope = selected.value.length ? 'selected' : 'all'
  batchOpen.value = true
}
function applyBatch() {
  const list = batchTargets.value
  if (!list || list.length === 0) {
    proxy.$modal.msgWarning('没有可调整的商品')
    return
  }
  list.forEach(row => { row.newStock = calcNew(row) })
  batchOpen.value = false
  proxy.$modal.msgSuccess('已调整 ' + list.length + ' 款商品，确认无误后点「保存」')
}

onMounted(() => {
  loadBrands()
  const b = route.query.brand
  if (b) {
    currentBrand.value = String(b)
    view.value = 'stock'
    loadProducts()
  }
})
</script>

<style scoped lang="scss">
.bp {
  .bp-toolbar { margin-bottom: 16px; }
  .bp-toolbar__row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .bp-toolbar__right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .bp-toolbar__chk { margin-left: 4px; }
  .bp-tip { margin-top: 10px; font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.6; }

  .bp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
    min-height: 200px;
    align-content: start;
  }
  .bp-card {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    padding: 14px 16px 10px;
    cursor: pointer;
    transition: transform 0.18s, box-shadow 0.18s;
    &:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12); border-color: var(--el-color-primary-light-5); }
    &__head { display: flex; align-items: center; gap: 8px; }
    &__dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
    &__name { font-size: 15px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    &__count { font-size: 12px; color: var(--el-text-color-secondary); }
    &__body { margin-top: 12px; }
    &__line { display: flex; align-items: center; font-size: 13px; line-height: 26px; }
    &__foot {
      margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--el-border-color-lighter);
      display: flex; align-items: center; justify-content: space-between; font-size: 12px;
    }
    &__onsale { color: var(--el-text-color-secondary); }
    &__enter { color: var(--el-color-primary); display: inline-flex; align-items: center; gap: 2px; }
  }
  .bp-label { width: 60px; color: var(--el-text-color-secondary); flex: none; }
  .bp-value { color: var(--el-text-color-primary); }
  .bp-value--empty { color: var(--el-text-color-placeholder); }
  .bp-value--good { color: var(--el-color-success); font-weight: 600; }
  .bp-value--danger { color: var(--el-color-danger); font-weight: 600; }
  .bp-muted { color: var(--el-text-color-placeholder); }

  .bp-crumb { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
  .bp-crumb__dot { width: 10px; height: 10px; border-radius: 50%; }

  .bp-pname { font-size: 13px; font-weight: 600; }
  .bp-pspec { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 2px; }

  .bp-empty { padding: 40px 0; }
  .bp-unit { margin-left: 8px; color: var(--el-text-color-secondary); }
  .bp-hint { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.5; margin-top: 2px; }
  .bp-preview { font-size: 13px; line-height: 1.8; }
  .bp-preview__sample { color: var(--el-text-color-regular); }
}
</style>
