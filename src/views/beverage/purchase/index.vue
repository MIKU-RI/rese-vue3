<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="进货单号" prop="purchaseNo">
        <el-input v-model="queryParams.purchaseNo" placeholder="请输入单号" clearable style="width: 220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="供应商" prop="supplierName">
        <el-select v-model="queryParams.supplierName" placeholder="全部供应商" clearable filterable style="width: 220px" @change="handleQuery">
          <el-option v-for="s in supplierOptions" :key="s.supplierId" :label="s.supplierName" :value="s.supplierName" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 140px">
          <el-option v-for="dict in statusOptions" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['beverage:purchase:add']">新增进货单</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single || editLocked" :title="editLocked ? '已入库或已产生退货的进货单不可修改，请先撤销入库' : ''" @click="handleUpdate" v-hasPermi="['beverage:purchase:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple || deleteLocked" :title="deleteLocked ? '已入库或已产生退货的进货单不可删除，请先撤销入库' : ''" @click="handleDelete" v-hasPermi="['beverage:purchase:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="purchaseList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="单号" align="center" prop="purchaseNo" width="170" />
      <el-table-column label="供应商" align="center" prop="supplierName" :show-overflow-tooltip="true" />
      <el-table-column label="进货日期" align="center" prop="purchaseDate" width="120" />
      <el-table-column label="总金额" align="center" prop="totalAmount" width="120">
        <template #default="scope">¥ {{ formatMoney(scope.row.totalAmount) }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="170">
        <template #default="scope">
          <el-tooltip :content="returnTip(scope.row)" placement="top" :disabled="!hasReturn(scope.row)">
            <el-tag :type="statusTagType(scope.row)">{{ statusText(scope.row) }}</el-tag>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="300" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button v-if="scope.row.status === '1'" link type="primary" icon="View" @click="handleDetail(scope.row)">明细</el-button>
          <el-button v-if="scope.row.status === '1'" link type="warning" icon="Wallet" @click="openPay(scope.row)" v-hasPermi="['beverage:settlement:add']">付款</el-button>
          <el-button v-if="scope.row.status === '0'" link type="success" icon="Bottom" @click="handleInbound(scope.row)" v-hasPermi="['beverage:purchase:edit']">入库</el-button>
          <el-button v-if="scope.row.status === '1'" link type="danger" icon="RefreshLeft" @click="goReturn(scope.row)" :disabled="returning || allReturned(scope.row)" :title="allReturned(scope.row) ? '该单已全部退货，无剩余可退数量' : ''" v-hasPermi="['beverage:return:add']">退货</el-button>
          <el-button v-if="scope.row.status === '1' && isAdmin" link type="warning" icon="Top" @click="handleReverseInbound(scope.row)" :disabled="hasReturn(scope.row)" :title="hasReturn(scope.row) ? '该单已产生退货记录，不可撤销入库；如需调整请通过「采购退货单」处理' : ''" v-hasPermi="['beverage:purchase:edit']">撤销入库</el-button>
          <el-button v-if="scope.row.status === '0' && !hasReturn(scope.row)" link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['beverage:purchase:edit']">修改</el-button>
          <el-button v-if="scope.row.status === '0' && !hasReturn(scope.row)" link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['beverage:purchase:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加/修改进货单对话框 -->
    <el-dialog :title="title" v-model="open" width="1280px" append-to-body>
      <el-form :model="form" :rules="rules" ref="purchaseRef" label-width="100px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplierName">
              <el-select v-model="form.supplierId" placeholder="请选择供应商" filterable style="width:100%" @change="onSupplierChange">
                <el-option v-for="s in supplierOptions" :key="s.supplierId" :label="s.supplierName" :value="s.supplierId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="进货日期" prop="purchaseDate">
              <el-date-picker v-model="form.purchaseDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio value="0">待入库</el-radio>
                <el-radio value="1" :disabled="!isAdmin" :title="!isAdmin ? '仅超管可直接登记为已入库，普通用户请先保存待入库再执行「入库」' : ''">已入库</el-radio>
              </el-radio-group>
              <div v-if="!isAdmin" style="color:#909399;font-size:12px;line-height:1.4;">普通用户只能保存为「待入库」，入库请点列表行「入库」按钮；已入库单据如需纠错请用「退货」</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单据金额">
              <span style="color:#f56c6c;font-weight:bold;">¥ {{ formatMoney(computedTotal) }}</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">进货明细</el-divider>
        <el-button type="primary" plain icon="Plus" size="small" @click="addItem" style="margin-bottom:8px">添加明细</el-button>
        <el-table :data="form.items" border>
          <el-table-column label="商品" min-width="160">
            <template #default="scope">
              <el-select v-model="scope.row.productId" placeholder="选择商品" filterable style="width:100%" @change="(val) => onProductChange(scope.row, val)">
                <el-option v-for="p in productOptions" :key="p.productId" :label="p.productName" :value="p.productId" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="规格" width="90">
            <template #default="scope"><span>{{ scope.row.spec || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="单位" width="60">
            <template #default="scope"><span>{{ scope.row.unit || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="批次号" width="150">
            <template #default="scope">
              <el-select v-model="scope.row.batchNo" filterable allow-create clearable default-first-option
                placeholder="批次号" style="width:100%" @change="(v) => onBatchNoChange(scope.row, v)">
                <el-option v-for="b in (scope.row.batchOptions || [])" :key="b.batchId" :label="b.batchNo" :value="b.batchNo">
                  <span>{{ b.batchNo }}</span>
                  <span style="float:right;color:var(--el-text-color-secondary);font-size:12px">
                    {{ (b.expiryDate || '').slice(0, 10) }}
                  </span>
                </el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="生产日期" width="140">
            <template #default="scope">
              <el-date-picker v-model="scope.row.productionDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD"
                placeholder="生产日期" style="width:100%" />
            </template>
          </el-table-column>
          <el-table-column label="保质期至" width="140">
            <template #default="scope">
              <el-date-picker v-model="scope.row.expiryDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD"
                placeholder="保质期至" style="width:100%" />
            </template>
          </el-table-column>
          <el-table-column label="数量" width="100">
            <template #default="scope">
              <el-input-number v-model="scope.row.qty" :min="1" :precision="0" :controls-position="'right'" style="width:100%" @change="recalc" />
            </template>
          </el-table-column>
          <el-table-column label="进货价" width="110">
            <template #default="scope"><span>¥ {{ formatMoney(scope.row.price) }}</span></template>
          </el-table-column>
          <el-table-column label="金额" width="110" align="center">
            <template #default="scope"><span>¥ {{ formatMoney(itemAmount(scope.row)) }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center">
            <template #default="scope">
              <el-button link type="danger" icon="Delete" @click="removeItem(scope.$index)" />
            </template>
          </el-table-column>
        </el-table>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 明细查看对话框 -->
    <el-dialog title="进货单明细" v-model="detailOpen" width="1000px" append-to-body>
      <el-descriptions :column="3" border size="small" style="margin-bottom:12px">
        <el-descriptions-item label="单号">{{ detail.purchaseNo }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ detail.supplierName }}</el-descriptions-item>
        <el-descriptions-item label="日期">{{ detail.purchaseDate }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥ {{ formatMoney(detail.totalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status === '0' ? '待入库' : '已入库' }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detail.items" border>
        <el-table-column label="商品名称" prop="productName" min-width="120" />
        <el-table-column label="规格" prop="spec" width="90" />
        <el-table-column label="单位" prop="unit" width="60" />
        <el-table-column label="批次号" prop="batchNo" width="120" />
        <el-table-column label="生产日期" prop="productionDate" width="100" align="center" />
        <el-table-column label="保质期至" prop="expiryDate" width="100" align="center" />
        <el-table-column label="数量" prop="qty" width="70" align="center" />
        <el-table-column label="单价" width="90" align="center"><template #default="s">¥ {{ formatMoney(s.row.price) }}</template></el-table-column>
        <el-table-column label="金额" width="100" align="center"><template #default="s">¥ {{ formatMoney(s.row.amount) }}</template></el-table-column>
      </el-table>
    </el-dialog>

    <!-- 退货预览确认：先预览原单可退商品并调整数量，确认后再生成退货单（不再一键直接生成） -->
    <ReturnPreviewDialog v-model="returnOpen" source-type="1" :source-id="returnRow.purchaseId" :source-no="returnRow.purchaseNo" @success="getList" />
    <SettlementDialog v-model="settleOpen" biz-type="2" :preset-related-id="settleRow.purchaseId" :preset-counterparty-id="settleRow.supplierId" @success="getList" />
  </div>
</template>

<script setup name="BeveragePurchase">
import { listPurchase, getPurchase, delPurchase, addPurchase, updatePurchase } from "@/api/beverage/purchase"
import { listSupplier } from "@/api/beverage/supplier"
import { listProduct } from "@/api/beverage/product"
import { listBatch } from "@/api/beverage/batch"
import ReturnPreviewDialog from "@/views/beverage/components/ReturnPreviewDialog.vue"
import SettlementDialog from "@/views/beverage/components/SettlementDialog.vue"
import { parseTime } from "@/utils/ruoyi"
import useUserStore from '@/store/modules/user'

const { proxy } = getCurrentInstance()

// 仅超管可：撤销入库、修改/删除已入库单据、直接登记为已入库
const isAdmin = computed(() => {
  const roles = useUserStore().roles || []
  return roles.includes('admin')
})

// 退货状态：已产生退货记录的单据不可再撤销入库/修改/删除（后端亦硬拦截）
// returnStatus: 0未退货 1退货中 2部分退货 3已退货(全部退完)
const hasReturn = (row) => !!row.returnStatus && row.returnStatus !== '0'
const allReturned = (row) => row.returnStatus === '3'

// 状态栏：出入库状态 + 退货进度合并为一个标签
// 颜色跟随出入库状态（部分退货与「已入库」同色=绿色），整单全退才弱化为灰色
// 退货进度用百分比展示，具体件数（原单/已退/剩余/待执行）放到标签悬停提示里
function statusTagType(row) {
  if (row.returnStatus === '3') return 'info'
  // 退货中：仅有待执行退货单、尚未生效，与「待入库」同为橙色提示
  if (row.returnStatus === '1') return 'warning'
  return row.status === '0' ? 'warning' : 'success'
}
function returnPercent(row) {
  const total = Number(row.totalQty) || 0
  if (!total) return 0
  const val = row.returnStatus === '1' ? (Number(row.pendingReturnQty) || 0) : (Number(row.returnQty) || 0)
  return Math.min(100, Math.round(val * 100 / total))
}
function statusText(row) {
  const base = row.status === '0' ? '待入库' : '已入库'
  if (!hasReturn(row)) return base
  if (row.returnStatus === '3') return base + ' · 已全退 100%'
  if (row.returnStatus === '1') return base + ' · 退货中 ' + returnPercent(row) + '%'
  return base + ' · 已退 ' + returnPercent(row) + '%'
}
function returnTip(row) {
  const total = Number(row.totalQty) || 0
  const done = Number(row.returnQty) || 0
  const pending = Number(row.pendingReturnQty) || 0
  let tip = '原单 ' + total + '，已退 ' + done + '，剩余可退 ' + Math.max(0, total - done)
  if (pending > 0) tip += '，待执行退货 ' + pending
  return tip
}

// 已入库（或已产生退货）的单据不可修改/删除：需先由超管「撤销入库」回到待入库态
const lockedRow = (row) => !!row && (row.status === '1' || hasReturn(row))
const selectedRows = ref([])
const editLocked = computed(() => selectedRows.value.length === 1 && lockedRow(selectedRows.value[0]))
const deleteLocked = computed(() => selectedRows.value.some(lockedRow))

// 关联下拉数据
const supplierOptions = ref([])
const productOptions = ref([])

function loadSuppliers() {
  listSupplier({ pageNum: 1, pageSize: 10000 }).then(res => { supplierOptions.value = res.rows || [] })
}
function loadProducts() {
  listProduct({ pageNum: 1, pageSize: 10000 }).then(res => { productOptions.value = res.rows || [] })
}
function onSupplierChange(val) {
  const s = supplierOptions.value.find(x => x.supplierId === val)
  form.value.supplierName = s ? s.supplierName : ''
}
function onProductChange(row, val) {
  const p = productOptions.value.find(x => x.productId === val)
  if (!p) return
  row.productId = p.productId
  row.productName = p.productName
  row.spec = p.spec
  row.unit = p.unit
  row.price = p.purchasePrice != null ? Number(p.purchasePrice) : 0
  if (!row.qty) row.qty = 1
  // 选择商品后自动带出批次信息：优先该商品最近一次进货的批次，无历史则给建议值
  loadBatchOptions(row)
}

/** 载入该商品已有批次；autoFill=true 时自动带出批次号/生产日期/保质期至（选择商品场景） */
function loadBatchOptions(row, autoFill) {
  if (!row.productId) return
  const fill = autoFill !== false
  listBatch({ productId: row.productId }).then(res => {
    const list = res.data || res.rows || []
    // 下拉只保留仍有效的批次（有存量或无存量但建档过的都保留，便于复用批次号）
    row.batchOptions = list
    // 最近一次建档的批次（batchId 最大）作为默认带出值
    const recent = list.slice().sort((a, b) => (b.batchId || 0) - (a.batchId || 0))[0]
    if (recent && fill) {
      row.batchNo = recent.batchNo
      row.productionDate = (recent.productionDate || '').toString().slice(0, 10) || row.productionDate
      row.expiryDate = (recent.expiryDate || '').toString().slice(0, 10) || row.expiryDate
    } else if (!recent && fill) {
      // 无历史批次：给出建议值（批次号 B+进货日期，生产日期=今天，保质期=今天+180天）
      const today = new Date()
      const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
      if (!row.batchNo) row.batchNo = 'B' + ymd
      if (!row.productionDate) row.productionDate = fmtDay(today)
      if (!row.expiryDate) row.expiryDate = fmtDay(new Date(today.getTime() + 180 * 86400000))
    }
  }).catch(() => {})
}

/** 选中已有批次号时，同步带出该批次的生产日期/保质期至 */
function onBatchNoChange(row, no) {
  const hit = (row.batchOptions || []).find(b => b.batchNo === no)
  if (hit) {
    row.productionDate = (hit.productionDate || '').toString().slice(0, 10) || row.productionDate
    row.expiryDate = (hit.expiryDate || '').toString().slice(0, 10) || row.expiryDate
  }
}

function fmtDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const purchaseList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const detail = reactive({ purchaseNo: '', supplierName: '', purchaseDate: '', status: '', totalAmount: 0, items: [] })

const statusOptions = ref([
  { label: '待入库', value: '0' },
  { label: '已入库', value: '1' }
])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    purchaseNo: undefined,
    supplierName: undefined,
    status: undefined
  },
  rules: {
    supplierName: [{ required: true, message: "供应商名称不能为空", trigger: "blur" }],
    purchaseDate: [{ required: true, message: "进货日期不能为空", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

function formatMoney(val) {
  if (val == null) return '0.00'
  return Number(val).toFixed(2)
}

function itemAmount(row) {
  const qty = Number(row.qty) || 0
  const price = Number(row.price) || 0
  return (qty * price).toFixed(2)
}

const computedTotal = computed(() => {
  if (!form.value.items) return '0.00'
  let t = 0
  form.value.items.forEach(it => { t += Number(itemAmount(it)) })
  return t.toFixed(2)
})

function recalc() { /* 触发 computedTotal 刷新 */ }

function addItem() {
  if (!form.value.items) form.value.items = []
  form.value.items.push({ productId: undefined, productName: '', spec: '', unit: '箱', qty: 1, price: 0, batchOptions: [] })
}

function removeItem(index) {
  form.value.items.splice(index, 1)
}

function getList() {
  loading.value = true
  listPurchase(queryParams.value).then(res => {
    loading.value = false
    purchaseList.value = res.rows
    total.value = res.total
  })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
  ids.value = selection.map(item => item.purchaseId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

function handleDelete(row) {
  // 已入库/已退货单据禁止删除（后端同样硬拦截），需先撤销入库
  if (row && lockedRow(row)) {
    proxy.$modal.msgWarning('已入库的进货单不可删除，请先撤销入库')
    return
  }
  if (!row && selectedRows.value.some(lockedRow)) {
    proxy.$modal.msgWarning('所选单据中包含已入库或已退货的进货单，请先撤销入库')
    return
  }
  const purchaseIds = row.purchaseId || ids.value
  proxy.$modal.confirm('是否确认删除采购单编号为"' + purchaseIds + '"的数据项？').then(function () {
    return delPurchase(purchaseIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function reset() {
  form.value = {
    purchaseId: undefined,
    purchaseNo: undefined,
    supplierName: undefined,
    purchaseDate: undefined,
    status: '0',
    remark: undefined,
    items: []
  }
  proxy.resetForm("purchaseRef")
}

function cancel() {
  open.value = false
  reset()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "添加进货单"
}

function handleUpdate(row) {
  // 已入库/已退货单据禁止修改（后端同样硬拦截），需先撤销入库
  const target = row || (selectedRows.value.length === 1 ? selectedRows.value[0] : null)
  if (target && lockedRow(target)) {
    proxy.$modal.msgWarning('已入库的进货单不可修改，请先撤销入库')
    return
  }
  reset()
  const purchaseId = row.purchaseId || ids.value
  getPurchase(purchaseId).then(res => {
    form.value = res.data
    if (!form.value.items) form.value.items = []
    // 载入已有明细行的批次下拉（保持批次号可正常回显并可切换，不覆盖已存值）
    form.value.items.forEach(it => { loadBatchOptions(it, false) })
    open.value = true
    title.value = "修改进货单"
  })
}

function handleDetail(row) {
  getPurchase(row.purchaseId).then(res => {
    Object.assign(detail, res.data)
    if (!detail.items) detail.items = []
    detailOpen.value = true
  })
}

// 一键入库 / 撤销入库：取全量(含明细)翻转状态后保存，复用已验证的库存联动
function handleInbound(row) {
  proxy.$modal.confirm('确认将进货单「' + row.purchaseNo + '」入库？将增加对应商品库存。').then(() => {
    getPurchase(row.purchaseId).then(res => {
      const d = res.data
      d.status = '1'
      updatePurchase(d).then(() => { proxy.$modal.msgSuccess('已入库'); getList() })
    })
  }).catch(() => {})
}
function handleReverseInbound(row) {
  proxy.$modal.confirm('确认撤销进货单「' + row.purchaseNo + '」入库？将回退对应商品库存。').then(() => {
    getPurchase(row.purchaseId).then(res => {
      const d = res.data
      d.status = '0'
      updatePurchase(d).then(() => { proxy.$modal.msgSuccess('已撤销入库'); getList() })
    })
  }).catch(() => {})
}

// 退货：先弹出预览（可勾选商品、调整数量/折扣/备注），用户确认后才生成退货单
const returning = ref(false)
const returnOpen = ref(false)
const returnRow = reactive({ purchaseId: undefined, purchaseNo: '' })
function goReturn(row) {
  if (returning.value) return
  returnRow.purchaseId = row.purchaseId
  returnRow.purchaseNo = row.purchaseNo
  returnOpen.value = true
}

// 付款登记：预填供应商与采购单，唤起共享收付款弹窗
const settleOpen = ref(false)
const settleRow = reactive({ purchaseId: undefined, supplierId: undefined })
function openPay(row) {
  settleRow.purchaseId = row.purchaseId
  settleRow.supplierId = row.supplierId
  settleOpen.value = true
}

function submitForm() {
  proxy.$refs["purchaseRef"].validate(valid => {
    if (valid) {
      // 批次信息校验：批次号与保质期至缺失时提示（选择商品后会自动带出，一般无需手填）
      const items = form.value.items || []
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (!it.batchNo || !String(it.batchNo).trim()) {
          proxy.$modal.msgError('第 ' + (i + 1) + ' 行缺少批次号，请选择商品自动带出或手工填写')
          return
        }
        if (!it.expiryDate) {
          proxy.$modal.msgError('第 ' + (i + 1) + ' 行缺少「保质期至」，请填写（批次 ' + it.batchNo + '）')
          return
        }
        if (it.productionDate && it.expiryDate && it.productionDate > it.expiryDate) {
          proxy.$modal.msgError('第 ' + (i + 1) + ' 行生产日期不能晚于保质期至')
          return
        }
      }
      const payload = JSON.parse(JSON.stringify(form.value))
      // 批次下拉选项是前端辅助数据，不提交到后端
      payload.items = (payload.items || []).map(it => {
        const { batchOptions, ...rest } = it
        return rest
      })
      payload.totalAmount = computedTotal.value
      if (form.value.purchaseId != undefined) {
        updatePurchase(payload).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addPurchase(payload).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

onMounted(() => {
  getList()
  loadSuppliers()
  loadProducts()
})
</script>

<style scoped lang="scss">
.mb8 { margin-bottom: 8px; }
</style>
