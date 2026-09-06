<template>
  <div class="app-container stock-page">
    <!-- 库存概览：紧凑条带，一眼看到每个商品当前还剩多少 -->
    <div class="overview-strip" v-loading="summaryLoading">
      <div class="ov-head">
        <span class="ov-title"><el-icon><Box /></el-icon> 库存概览</span>
        <span class="ov-sub">{{ summaryList.length }} 个商品 · 合计 {{ totalStockQty }} 件/箱 · 点击商品可筛选流水</span>
      </div>
      <div v-if="summaryList.length === 0" class="empty-tip">暂无库存数据</div>
      <div v-else class="ov-list">
        <div v-for="s in summaryList" :key="s.productId" class="ov-item"
             :class="{ active: queryParams.productName === s.productName }"
             @click="filterByProduct(s.productName)">
          <div class="ov-top">
            <span class="ov-name" :title="s.productName">{{ s.productName }}</span>
            <span class="ov-qty">{{ s.currentQty }}<i>{{ s.unit }}</i></span>
          </div>
          <div class="ov-spec">{{ s.spec }} / {{ s.unit }}</div>
        </div>
      </div>
    </div>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="60px" class="query-form">
      <el-form-item label="商品" prop="productName">
        <el-select v-model="queryParams.productName" placeholder="全部商品" clearable filterable style="width: 170px" @change="handleQuery">
          <el-option v-for="p in productOptions" :key="p.productId" :label="p.productName" :value="p.productName" />
        </el-select>
      </el-form-item>
      <el-form-item label="品牌" prop="brand">
        <el-select v-model="queryParams.brand" placeholder="全部品牌" clearable filterable style="width: 140px" @change="handleQuery">
          <el-option v-for="o in beverage_brand" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="来源" prop="refType">
        <el-select v-model="queryParams.refType" placeholder="全部来源" clearable style="width: 130px" @change="handleQuery">
          <el-option v-for="o in sourceOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="变动" prop="changeType">
        <el-select v-model="queryParams.changeType" placeholder="全部" clearable style="width: 100px" @change="handleQuery">
          <el-option v-for="dict in typeOptions" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8 toolbar-row">
      <el-col :span="12">
        <el-button type="primary" plain icon="Plus" size="small" @click="handleAdd" v-hasPermi="['beverage:stock:add']">新增流水</el-button>
        <el-button type="danger" plain icon="Delete" size="small" :disabled="multiple" @click="handleDelete" v-hasPermi="['beverage:stock:remove']">删除</el-button>
        <span class="legend">
          <i class="lg lg-in"></i>采购入库
          <i class="lg lg-out"></i>销售出库
          <i class="lg lg-pr"></i>采购退货
          <i class="lg lg-sr"></i>销售退货
          <i class="lg lg-man"></i>手动/盘点
          <i class="lg lg-rev"></i>撤销/冲销
        </span>
      </el-col>
      <el-col :span="12" style="text-align: right">
        <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="stockList" size="small" class="compact-table" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="42" align="center" />
      <el-table-column label="商品名称" align="left" prop="productName" :show-overflow-tooltip="true" min-width="130" />
      <el-table-column label="规格/单位" align="center" width="110">
        <template #default="scope"><span>{{ scope.row.spec }} / {{ scope.row.unit }}</span></template>
      </el-table-column>
      <el-table-column label="来源" align="center" width="100">
        <template #default="scope">
          <el-tag :type="sourceInfo(scope.row).tagType" effect="light" size="small">{{ sourceInfo(scope.row).label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="变动" align="center" width="110">
        <template #default="scope">
          <span :style="{ color: changeColor(scope.row), fontWeight: isReverseRow(scope.row) ? 400 : 600, textDecoration: isReverseRow(scope.row) ? 'line-through' : 'none' }">
            <template v-if="isReverseRow(scope.row)">
              <span style="font-size:11px;color:#909399;margin-right:2px">撤销</span>
            </template>
            <template v-if="changeSign(scope.row) !== '±'">
              {{ changeSign(scope.row) }}
            </template>
            {{ Math.abs(scope.row.changeQty) }} {{ scope.row.unit }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="变动后库存" align="center" prop="afterQty" width="90" />
      <el-table-column label="关联单号" align="center" width="185">
        <template #default="scope">
          <template v-if="scope.row.refStatus === '1'">
            <span style="color:#c0c4cc;text-decoration:line-through">{{ scope.row.refNo }}</span>
            <el-tag type="info" effect="plain" size="small" style="margin-left:4px">已删除</el-tag>
          </template>
          <el-link v-else-if="scope.row.refNo" type="primary" :underline="false" @click="openRefDetail(scope.row.refNo)">
            {{ scope.row.refNo }} <el-icon><Right /></el-icon>
          </el-link>
          <span v-else style="color:#c0c4cc">— 手动 —</span>
        </template>
      </el-table-column>
      <el-table-column label="时间" align="center" prop="createTime" width="145">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d} {h}:{i}') }}</span></template>
      </el-table-column>
      <el-table-column label="操作人" align="center" width="95">
        <template #default="scope">
          <span>{{ scope.row.createByNickName || scope.row.createBy || '—' }}</span>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 新增/编辑流水 -->
    <el-dialog :title="title" v-model="open" width="700px" append-to-body>
      <el-form :model="form" :rules="rules" ref="stockRef" label-width="100px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="商品名称" prop="productName">
              <el-select v-model="form.productId" placeholder="请选择商品" filterable clearable style="width: 100%" @change="onProductChange">
                <el-option v-for="p in productOptions" :key="p.productId" :label="p.productName" :value="p.productId" />
              </el-select>
              <div class="form-tip">从商品档案选择，自动带出规格/单位；库存按商品ID精确联动</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格" prop="spec">
              <el-input v-model="form.spec" placeholder="如 500ml/瓶" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="8">
            <el-form-item label="单位" prop="unit">
              <el-input v-model="form.unit" placeholder="箱/瓶" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="变动类型" prop="changeType">
              <el-select v-model="form.changeType" placeholder="请选择" style="width: 100%">
                <el-option v-for="dict in typeOptions" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="变动数量" prop="changeQty">
              <el-input-number v-model="form.changeQty" :min="0" :precision="0" :controls-position="'right'" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="变动后库存" prop="afterQty">
              <el-input-number v-model="form.afterQty" :min="0" :precision="0" :controls-position="'right'" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联单号" prop="refNo">
              <el-input v-model="form.refNo" placeholder="选填，如 CG2026..." />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 关联单据详情 -->
    <el-dialog :title="detailTitle" v-model="detailVisible" width="760px" append-to-body>
      <div v-loading="detailLoading">
        <el-empty v-if="detailData && detailData.notFound" description="未找到对应单据（可能已被删除）" />
        <template v-else-if="detailData">
          <el-descriptions :column="2" border size="small" class="doc-desc">
            <el-descriptions-item label="单据编号">{{ detailData.docNo }}</el-descriptions-item>
            <el-descriptions-item label="单据类型">
              <el-tag :type="detailData.tagType" effect="light">{{ detailData.typeLabel }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="往来单位">{{ detailData.partner || '—' }}</el-descriptions-item>
            <el-descriptions-item label="业务日期">{{ detailData.date || '—' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="detailData.status === '1' ? 'success' : 'info'" effect="plain">
                {{ detailData.status === '1' ? '已处理' : '待处理' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="单据金额">¥ {{ fmtMoney(detailData.amount) }}</el-descriptions-item>
          </el-descriptions>
          <el-divider content-position="left">明细</el-divider>
          <el-table :data="detailData.items" size="small" border>
            <el-table-column label="商品" prop="productName" min-width="120" />
            <el-table-column label="规格" prop="spec" width="100" />
            <el-table-column label="单位" prop="unit" width="60" />
            <el-table-column label="数量" prop="qty" width="70" align="center" />
            <el-table-column label="单价" prop="price" width="80" align="center">
              <template #default="s">¥ {{ fmtMoney(s.row.price) }}</template>
            </el-table-column>
            <el-table-column label="金额" prop="amount" width="90" align="center">
              <template #default="s">¥ {{ fmtMoney(s.row.amount) }}</template>
            </el-table-column>
          </el-table>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关 闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="BeverageStock">
import { listStock, getStock, delStock, addStock, updateStock, getStockSummary } from "@/api/beverage/stock"
import { listProduct } from "@/api/beverage/product"
import { listPurchase, getPurchase } from "@/api/beverage/purchase"
import { listSale, getSale } from "@/api/beverage/sale"
import { listReturn, getReturn } from "@/api/beverage/return"
import { parseTime } from "@/utils/ruoyi"
import { useDict } from "@/utils/dict"

const { proxy } = getCurrentInstance()
const { beverage_brand } = useDict('beverage_brand')

// 来源类型筛选项（值与后端 CASE 推断一致）
const sourceOptions = ref([
  { label: '采购入库', value: 'purchase' },
  { label: '销售出库', value: 'sale' },
  { label: '采购退货', value: 'purchaseReturn' },
  { label: '销售退货', value: 'saleReturn' },
  { label: '手动/盘点', value: 'manual' }
])

const typeOptions = ref([
  { label: '入库', value: '0' },
  { label: '出库', value: '1' },
  { label: '盘点', value: '2' }
])

// 关联下拉：商品
const productOptions = ref([])
function loadProducts() {
  listProduct({ pageNum: 1, pageSize: 10000 }).then(res => { productOptions.value = res.rows || [] })
}

const stockList = ref([])
const summaryList = ref([])
const open = ref(false)
const loading = ref(true)
const summaryLoading = ref(false)
const showSearch = ref(true)
const ids = ref([])
const multiple = ref(true)
const total = ref(0)
const title = ref("")

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref(null)
const detailTitle = ref("关联单据详情")

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    productName: undefined,
    brand: undefined,
    changeType: undefined,
    refType: undefined
  },
  rules: {
    productName: [{ required: true, message: "商品名称不能为空", trigger: "blur" }],
    changeType: [{ required: true, message: "变动类型不能为空", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

// ===== 来源类型解析（按 refNo 前缀判断业务单据类型） =====
function parseRefType(refNo) {
  if (!refNo) return 'manual'
  if (refNo.startsWith('CGTH')) return 'purchaseReturn'
  if (refNo.startsWith('XSTH')) return 'saleReturn'
  if (refNo.startsWith('CG')) return 'purchase'
  if (refNo.startsWith('XS')) return 'sale'
  return 'manual'
}

const SOURCE_META = {
  purchase:       { label: '采购入库', tagType: 'success', reverseLabel: '撤销采购入库' },
  sale:           { label: '销售出库', tagType: 'danger',  reverseLabel: '撤销销售出库' },
  purchaseReturn: { label: '采购退货', tagType: 'warning', reverseLabel: '撤销采购退货' },
  saleReturn:     { label: '销售退货', tagType: 'warning', reverseLabel: '撤销销售退货' },
  manual:         { label: '手动/盘点', tagType: 'info',   reverseLabel: '撤销手动调整' }
}

function isReverseRow(row) {
  return row.actionType === 'reverse' || (row.remark && (row.remark.includes('作废') || row.remark.includes('冲销')))
}

function sourceInfo(row) {
  const reverse = isReverseRow(row)
  const deleted = row.refStatus === '1'
  let type = parseRefType(row.refNo)
  if (type === 'manual' && row.changeType === '2') {
    return { type, label: reverse ? '撤销盘点' : '盘点', tagType: 'info', reverse, deleted }
  }
  const meta = SOURCE_META[type] || SOURCE_META.manual
  const label = reverse ? (meta.reverseLabel || ('撤销' + meta.label)) : meta.label
  // 来源单已被删除：统一置灰，避免客户误以为该流水仍可追溯到有效单据
  return { type, label: deleted ? '已失效' : label, tagType: deleted || reverse ? 'info' : meta.tagType, reverse, deleted }
}

function changeColor(row) {
  if (isReverseRow(row)) return '#909399'    // 撤销/冲销 灰
  // 按变动数量正负区分方向：增=绿、减=红（覆盖入库/出库/手动盘点全部类型）
  const q = Number(row.changeQty)
  if (q > 0) return '#67C23A'
  if (q < 0) return '#F56C6C'
  return '#909399'
}

// 变动符号：正数 +、负数 −、零 ±（不再依赖 changeType，手动盘点也能看出增减）
function changeSign(row) {
  const q = Number(row.changeQty)
  if (q > 0) return '+'
  if (q < 0) return '−'
  return '±'
}

// ===== 库存概览 =====
function loadSummary() {
  summaryLoading.value = true
  getStockSummary({ productName: queryParams.value.productName, brand: queryParams.value.brand }).then(res => {
    summaryList.value = res.data || res.rows || []
  }).catch(() => { summaryList.value = [] })
    .finally(() => { summaryLoading.value = false })
}
const totalStockQty = computed(() => summaryList.value.reduce((s, x) => s + (Number(x.currentQty) || 0), 0))

// ===== 列表 =====
function getList() {
  loading.value = true
  listStock(queryParams.value).then(res => {
    loading.value = false
    stockList.value = res.rows
    total.value = res.total
  })
  loadSummary()
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm("queryRef")
  queryParams.value.refType = undefined
  handleQuery()
}

function filterByProduct(name) {
  // 再次点击已选中的商品 = 取消筛选
  queryParams.value.productName = queryParams.value.productName === name ? undefined : name
  queryParams.value.pageNum = 1
  getList()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.stockId)
  multiple.value = !selection.length
}

function handleDelete(row) {
  const stockIds = row.stockId || ids.value
  proxy.$modal.confirm('是否确认删除流水编号为"' + stockIds + '"的数据项？').then(function () {
    return delStock(stockIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function reset() {
  form.value = {
    stockId: undefined,
    productId: undefined,
    productName: undefined,
    spec: undefined,
    unit: '瓶',
    changeType: '0',
    changeQty: 0,
    afterQty: 0,
    refNo: undefined,
    remark: undefined
  }
  proxy.resetForm("stockRef")
}

function cancel() {
  open.value = false
  reset()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "新增库存流水"
}

function submitForm() {
  proxy.$refs["stockRef"].validate(valid => {
    if (valid) {
      if (form.value.stockId != undefined) {
        updateStock(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addStock(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

function onProductChange(val) {
  const p = productOptions.value.find(x => x.productId === val)
  if (!p) {
    form.value.productName = undefined
    form.value.spec = undefined
    form.value.unit = undefined
    return
  }
  form.value.productName = p.productName
  form.value.spec = p.spec
  form.value.unit = p.unit
}

// ===== 关联单据详情 =====
function fmtMoney(v) {
  const n = Number(v)
  if (!isFinite(n)) return '0.00'
  return n.toFixed(2)
}

function openRefDetail(refNo) {
  const type = parseRefType(refNo)
  if (type === 'manual') {
    proxy.$modal.msgInfo('该记录为手动调整/盘点，无关联业务单据')
    return
  }
  const map = {
    purchase:       { listApi: listPurchase, getApi: getPurchase, noField: 'purchaseNo', typeLabel: '采购入库', tagType: 'success' },
    sale:           { listApi: listSale, getApi: getSale, noField: 'saleNo', typeLabel: '销售出库', tagType: 'danger' },
    purchaseReturn: { listApi: listReturn, getApi: getReturn, noField: 'returnNo', typeLabel: '采购退货', tagType: 'warning' },
    saleReturn:     { listApi: listReturn, getApi: getReturn, noField: 'returnNo', typeLabel: '销售退货', tagType: 'warning' }
  }
  const conf = map[type]
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = null
  detailTitle.value = '关联单据：' + refNo
  conf.listApi({ [conf.noField]: refNo, pageSize: 1 }).then(res => {
    const rows = res.rows || []
    const row = rows[0]
    if (!row) {
      detailData.value = { notFound: true }
      detailLoading.value = false
      return
    }
    const id = row.purchaseId || row.saleId || row.returnId
    return conf.getApi(id).then(r => {
      detailData.value = adaptDoc(r.data || r, conf)
      detailLoading.value = false
    })
  }).catch(() => {
    detailData.value = { notFound: true }
    detailLoading.value = false
  })
}

function adaptDoc(d, conf) {
  if (!d) return { notFound: true }
  const partner = d.supplierName || d.customerName || (d.partnerName) || ''
  const date = d.purchaseDate || d.saleDate || d.returnDate || ''
  const docNo = d.purchaseNo || d.saleNo || d.returnNo || ''
  const amount = d.totalAmount != null ? d.totalAmount : (d.total_amount != null ? d.total_amount : 0)
  const items = (d.items || []).map(it => ({
    productName: it.productName || it.product_name || '',
    spec: it.spec || '',
    unit: it.unit || '',
    qty: it.qty != null ? it.qty : (it.quantity != null ? it.quantity : ''),
    price: it.price != null ? it.price : (it.unit_price != null ? it.unit_price : ''),
    amount: it.amount != null ? it.amount : (it.line_amount != null ? it.line_amount : '')
  }))
  return {
    docNo, partner, date, amount, status: d.status, items,
    typeLabel: conf.typeLabel, tagType: conf.tagType
  }
}

onMounted(() => {
  getList()
  loadProducts()
})
</script>

<style scoped lang="scss">
/* ===== 页面整体密度 ===== */
.stock-page { padding: 12px 14px; }
.mb8 { margin-bottom: 8px; }
.form-tip {
  font-size: 12px; line-height: 1.4; color: var(--el-text-color-secondary); margin-top: 2px;
}

/* ===== 查询区：压缩行距 ===== */
.query-form {
  margin-bottom: 6px;
  :deep(.el-form-item) { margin-bottom: 8px; margin-right: 12px; }
}

/* ===== 工具栏：按钮 + 图例同行，更紧凑 ===== */
.toolbar-row { align-items: center; }
.toolbar-row .el-button + .el-button { margin-left: 8px; }
.legend { font-size: 12px; color: #909399; display: inline-flex; align-items: center; margin-left: 14px; gap: 2px; }
.legend .lg { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin: 0 3px 0 10px; }
.lg-in { background: #67C23A; }
.lg-out { background: #F56C6C; }
.lg-pr { background: #E6A23C; }
.lg-sr { background: #E6A23C; }
.lg-man { background: #909399; }
.lg-rev { background: #C0C4CC; }

/* ===== 库存概览条带：替代大卡片，紧凑网格 ===== */
.overview-strip {
  border: 1px solid var(--el-border-color-lighter); border-radius: 6px;
  background: var(--el-fill-color-blank);
  padding: 8px 12px; margin-bottom: 10px;
}
.ov-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
.ov-title { font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; }
.ov-title .el-icon { vertical-align: -2px; margin-right: 4px; }
.ov-sub { font-size: 12px; color: #909399; }
.ov-list {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px; max-height: 108px; overflow-y: auto;
}
.ov-item {
  border: 1px solid var(--el-border-color-lighter); border-radius: 5px;
  padding: 5px 9px; cursor: pointer; transition: all .15s;
  background: var(--el-bg-color);
}
.ov-item:hover, .ov-item.active { border-color: var(--el-color-primary); box-shadow: 0 1px 5px rgba(0,0,0,.07); }
.ov-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.ov-name { font-weight: 600; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ov-qty { font-size: 15px; font-weight: 700; color: var(--el-color-primary); white-space: nowrap; }
.ov-qty i { font-style: normal; font-size: 11px; color: #909399; margin-left: 2px; font-weight: normal; }
.ov-spec { font-size: 11px; color: #909399; margin-top: 1px; }
.empty-tip { color: #c0c4cc; font-size: 13px; padding: 8px 0; }

/* ===== 表格：压缩行高 ===== */
.compact-table {
  :deep(.el-table__cell) { padding: 5px 0; }
  :deep(.el-table__header th) { font-weight: 600; }
}
.doc-desc { margin-bottom: 6px; }
</style>
