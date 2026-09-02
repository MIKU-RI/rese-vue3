<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="76px">
      <el-form-item label="退货单号" prop="returnNo">
        <el-input v-model="queryParams.returnNo" placeholder="请输入单号" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="来源单号" prop="sourceNo">
        <el-input v-model="queryParams.sourceNo" placeholder="原进货/销售单号" clearable style="width: 170px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="退货类型" prop="returnType">
        <el-select v-model="queryParams.returnType" placeholder="退货类型" clearable style="width: 140px">
          <el-option v-for="dict in returnTypeOptions" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="往来单位" prop="partnerName">
        <el-select v-model="queryParams.partnerName" placeholder="全部往来单位" clearable filterable style="width: 200px" @change="handleQuery">
          <template v-if="queryParams.returnType !== '2'">
            <el-option-group label="供应商">
              <el-option v-for="s in supplierOptions" :key="'s' + s.supplierId" :label="s.supplierName" :value="s.supplierName" />
            </el-option-group>
          </template>
          <template v-if="queryParams.returnType !== '1'">
            <el-option-group label="客户">
              <el-option v-for="c in customerOptions" :key="'c' + c.customerId" :label="c.customerName" :value="c.customerName" />
            </el-option-group>
          </template>
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 120px">
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['beverage:return:add']">新增退货单</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['beverage:return:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['beverage:return:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="returnList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="退货单号" align="center" prop="returnNo" width="180" />
      <el-table-column label="来源单号" align="center" width="160">
        <template #default="scope">
          <span>{{ scope.row.sourceNo || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="类型" align="center" prop="returnType" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.returnType === '1' ? 'primary' : 'success'">{{ scope.row.returnType === '1' ? '采购退货' : '销售退货' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="往来单位" align="center" :show-overflow-tooltip="true">
        <template #default="scope">{{ scope.row.returnType === '1' ? scope.row.supplierName : scope.row.customerName }}</template>
      </el-table-column>
      <el-table-column label="退货日期" align="center" prop="returnDate" width="120" />
      <el-table-column label="总金额" align="center" prop="totalAmount" width="120">
        <template #default="scope">¥ {{ formatMoney(scope.row.totalAmount) }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.status === '0' ? 'warning' : 'success'">{{ scope.row.status === '0' ? '待退货' : '已退货' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="210" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)">明细</el-button>
          <el-button v-if="scope.row.status === '0'" link type="success" icon="Top" @click="handleApply(scope.row)" v-hasPermi="['beverage:return:edit']">退货</el-button>
          <el-button v-if="scope.row.status === '1'" link type="warning" icon="Bottom" @click="handleReverse(scope.row)" v-hasPermi="['beverage:return:edit']">撤销退货</el-button>
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['beverage:return:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['beverage:return:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加/修改退货单对话框 -->
    <el-dialog :title="title" v-model="open" width="900px" append-to-body>
      <el-form :model="form" :rules="rules" ref="returnRef" label-width="100px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="退货类型" prop="returnType">
              <el-radio-group v-model="form.returnType" @change="onTypeChange">
                <el-radio-button value="1">采购退货</el-radio-button>
                <el-radio-button value="2">销售退货</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="退货日期" prop="returnDate">
              <el-date-picker v-model="form.returnDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item :label="isPurchaseReturn ? '供应商' : '客户'" prop="partnerName">
              <el-select v-model="form.partnerId" :placeholder="'请选择' + (isPurchaseReturn ? '供应商' : '客户')" filterable style="width:100%" @change="onPartnerChange">
                <el-option v-if="isPurchaseReturn" v-for="s in supplierOptions" :key="s.supplierId" :label="s.supplierName" :value="s.supplierId" />
                <el-option v-else v-for="c in customerOptions" :key="c.customerId" :label="c.customerName" :value="c.customerId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单据金额">
              <span style="color:#f56c6c;font-weight:bold;">¥ {{ formatMoney(computedTotal) }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio value="0">待退货（仅登记，不动库存）</el-radio>
                <el-radio value="1">已退货（立即联动库存）</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="来源单据">
              <template v-if="!form.returnId">
                <el-select v-model="form.sourceId" placeholder="（可选）选已入库/已出库单据，自动带出明细" clearable filterable style="width:100%" @change="onSourceChange" :disabled="loadingSource">
                  <el-option v-for="s in sourceOptions" :key="s.id" :label="s.label" :value="s.id" />
                </el-select>
              </template>
              <template v-else>
                <span>{{ form.sourceNo || '（无关联原单）' }}</span>
              </template>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">退货明细（规格/单位/单价由商品档案带出，不可修改）</el-divider>
        <el-button type="primary" plain icon="Plus" size="small" @click="addItem" style="margin-bottom:8px">添加明细</el-button>
        <el-table :data="form.items" border>
          <el-table-column label="商品" min-width="180">
            <template #default="scope">
              <el-select v-model="scope.row.productId" placeholder="选择商品" filterable style="width:100%" @change="(val) => onProductChange(scope.row, val)">
                <el-option v-for="p in productOptions" :key="p.productId" :label="p.productName" :value="p.productId" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="规格" width="120">
            <template #default="scope"><span>{{ scope.row.spec || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="单位" width="70">
            <template #default="scope"><span>{{ scope.row.unit || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="数量" width="115">
            <template #default="scope">
              <el-input-number v-model="scope.row.qty" :min="1" :precision="0" :max="scope.row.origQty || undefined" :controls-position="'right'" style="width:100%" @change="recalc" />
              <div v-if="scope.row.origQty" style="color:#909399;font-size:12px;line-height:1.3;">原单 {{ scope.row.origQty }}{{ scope.row.unit }}</div>
            </template>
          </el-table-column>
          <el-table-column :label="isPurchaseReturn ? '进货价' : '售价'" width="115">
            <template #default="scope"><span>¥ {{ formatMoney(scope.row.price) }}</span></template>
          </el-table-column>
          <el-table-column v-if="!isPurchaseReturn" label="折扣%" width="110">
            <template #default="scope">
              <el-input-number v-model="scope.row.discount" :min="1" :max="100" :precision="0" :controls-position="'right'" style="width:100%" @change="recalc" />
            </template>
          </el-table-column>
          <el-table-column :label="isPurchaseReturn ? '金额' : '实收金额'" width="115" align="center">
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
    <el-dialog title="退货单明细" v-model="detailOpen" width="820px" append-to-body>
      <el-descriptions :column="3" border size="small" style="margin-bottom:12px">
        <el-descriptions-item label="单号">{{ detail.returnNo }}</el-descriptions-item>
        <el-descriptions-item label="来源单号">{{ detail.sourceNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detail.returnType === '1' ? '采购退货' : '销售退货' }}</el-descriptions-item>
        <el-descriptions-item label="往来单位">{{ detail.returnType === '1' ? detail.supplierName : detail.customerName }}</el-descriptions-item>
        <el-descriptions-item label="日期">{{ detail.returnDate }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥ {{ formatMoney(detail.totalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status === '0' ? '待退货' : '已退货' }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detail.items" border>
        <el-table-column label="商品名称" prop="productName" />
        <el-table-column label="规格" prop="spec" width="120" />
        <el-table-column label="单位" prop="unit" width="70" />
        <el-table-column label="数量" prop="qty" width="80" align="center" />
        <el-table-column label="单价" width="100" align="center"><template #default="s">¥ {{ formatMoney(s.row.price) }}</template></el-table-column>
        <el-table-column v-if="detail.returnType === '2'" label="折扣%" width="90" align="center"><template #default="s">{{ formatMoney(s.row.discount) }}</template></el-table-column>
        <el-table-column :label="detail.returnType === '2' ? '实收金额' : '金额'" width="110" align="center"><template #default="s">¥ {{ formatMoney(s.row.amount) }}</template></el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup name="BeverageReturn">
import { listReturn, getReturn, delReturn, addReturn, updateReturn } from "@/api/beverage/return"
import { listSupplier } from "@/api/beverage/supplier"
import { listCustomer } from "@/api/beverage/customer"
import { listProduct } from "@/api/beverage/product"
import { getPurchase } from "@/api/beverage/purchase"
import { getSale } from "@/api/beverage/sale"
import { listPurchase } from "@/api/beverage/purchase"
import { listSale } from "@/api/beverage/sale"
import { parseTime } from "@/utils/ruoyi"
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const { proxy } = getCurrentInstance()

const supplierOptions = ref([])
const customerOptions = ref([])
const productOptions = ref([])
// 关联原单下拉（已入库采购单 / 已出库销售单）
const sourceOptions = ref([])
const loadingSource = ref(false)

function loadSuppliers() {
  listSupplier({ pageNum: 1, pageSize: 10000 }).then(res => { supplierOptions.value = res.rows || [] })
}
function loadCustomers() {
  listCustomer({ pageNum: 1, pageSize: 10000 }).then(res => { customerOptions.value = res.rows || [] })
}
function loadProducts() {
  listProduct({ pageNum: 1, pageSize: 10000 }).then(res => { productOptions.value = res.rows || [] })
}

const isPurchaseReturn = computed(() => form.value.returnType === '1')

function onTypeChange() {
  // 切换类型：仅清空往来单位/来源与明细（价格口径由 onProductChange 按新类型带出），
  // 不能 resetForm——会把 returnType 重置回首次挂载值，导致无法选中「销售退货」
  form.value.partnerId = undefined
  form.value.supplierId = undefined
  form.value.customerId = undefined
  form.value.supplierName = undefined
  form.value.customerName = undefined
  form.value.sourceId = undefined
  form.value.sourceNo = undefined
  form.value.items = []
  if (proxy.$refs.returnRef) proxy.$refs.returnRef.clearValidate(['partnerName', 'returnDate'])
  // 新增态下刷新来源单下拉
  if (open.value && !form.value.returnId) reloadSourceOptions()
}
function onPartnerChange(val) {
  if (isPurchaseReturn.value) {
    const s = supplierOptions.value.find(x => x.supplierId === val)
    form.value.supplierId = s ? s.supplierId : undefined
    form.value.supplierName = s ? s.supplierName : ''
  } else {
    const c = customerOptions.value.find(x => x.customerId === val)
    form.value.customerId = c ? c.customerId : undefined
    form.value.customerName = c ? c.customerName : ''
  }
}
function onProductChange(row, val) {
  const p = productOptions.value.find(x => x.productId === val)
  if (!p) return
  row.productId = p.productId
  row.productName = p.productName
  row.spec = p.spec
  row.unit = p.unit
  row.price = isPurchaseReturn.value
    ? (p.purchasePrice != null ? Number(p.purchasePrice) : 0)
    : (p.salePrice != null ? Number(p.salePrice) : 0)
  row.discount = 100
  if (!row.qty) row.qty = 1
}

// ============ 关联来源单据（需求：退货单与采购/销售单号关联，自动带出明细） ============
function today() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

// 按退货类型加载可选原单：采购退货=已入库采购单；销售退货=已出库销售单
function reloadSourceOptions() {
  sourceOptions.value = []
  if (isPurchaseReturn.value) {
    listPurchase({ pageNum: 1, pageSize: 1000, status: '1' }).then(res => {
      sourceOptions.value = (res.rows || []).map(r => ({ id: r.purchaseId, label: r.purchaseNo + ' · ' + (r.supplierName || '') + '  ¥' + formatMoney(r.totalAmount) }))
    })
  } else {
    listSale({ pageNum: 1, pageSize: 1000, status: '1' }).then(res => {
      sourceOptions.value = (res.rows || []).map(r => ({ id: r.saleId, label: r.saleNo + ' · ' + (r.customerName || '') + '  ¥' + formatMoney(r.totalAmount) }))
    })
  }
}

// 选择原单后自动带出该单往来单位与明细（数量可改，但不超过原单数量）
function onSourceChange(sourceId) {
  if (!sourceId) {
    form.value.sourceId = undefined
    form.value.sourceNo = undefined
    return
  }
  loadingSource.value = true
  const done = () => { loadingSource.value = false }
  if (isPurchaseReturn.value) {
    getPurchase(sourceId).then(res => {
      const d = res.data || {}
      form.value.sourceId = d.purchaseId
      form.value.sourceNo = d.purchaseNo
      form.value.supplierId = d.supplierId
      form.value.supplierName = d.supplierName
      form.value.customerId = undefined
      form.value.customerName = undefined
      form.value.items = (d.items || []).map(it => ({
        productId: it.productId, productName: it.productName, spec: it.spec, unit: it.unit,
        qty: it.qty, origQty: it.qty, price: it.price, discount: 100, sourceQty: it.qty
      }))
      done()
    }).catch(done)
  } else {
    getSale(sourceId).then(res => {
      const d = res.data || {}
      form.value.sourceId = d.saleId
      form.value.sourceNo = d.saleNo
      form.value.customerId = d.customerId
      form.value.customerName = d.customerName
      form.value.supplierId = undefined
      form.value.supplierName = undefined
      form.value.items = (d.items || []).map(it => ({
        productId: it.productId, productName: it.productName, spec: it.spec, unit: it.unit,
        qty: it.qty, origQty: it.qty, price: it.price,
        discount: (it.discount == null || Number(it.discount) === 0) ? 100 : Number(it.discount),
        sourceQty: it.qty
      }))
      done()
    }).catch(done)
  }
  proxy.$refs.returnRef && proxy.$refs.returnRef.clearValidate(['partnerName'])
}

// 供其它页面跳转带参进入：sourceType=1采购退货/2销售退货 + sourceId/sourceNo
function handleAddFromSource(query) {
  reset()
  form.value.returnType = query.sourceType === '2' ? '2' : '1'
  form.value.sourceNo = query.sourceNo || undefined
  open.value = true
  title.value = '新增退货单' + (form.value.sourceNo ? '（来源单 ' + form.value.sourceNo + '）' : '')
  // 有来源ID时直接按该单加载明细与往来单位
  if (query.sourceId) {
    form.value.sourceId = Number(query.sourceId)
    onSourceChange(form.value.sourceId)
  }
}

const returnList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const detail = reactive({ returnNo: '', sourceNo: '', returnType: '1', supplierName: '', customerName: '', returnDate: '', status: '', totalAmount: 0, items: [] })

const returnTypeOptions = ref([
  { label: '采购退货', value: '1' },
  { label: '销售退货', value: '2' }
])
const statusOptions = ref([
  { label: '待退货', value: '0' },
  { label: '已退货', value: '1' }
])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    returnNo: undefined,
    sourceNo: undefined,
    returnType: undefined,
    partnerName: undefined,
    status: undefined
  },
  rules: {
    returnType: [{ required: true, message: "退货类型不能为空", trigger: "change" }],
    returnDate: [{ required: true, message: "退货日期不能为空", trigger: "change" }],
    partnerName: [{ required: true, message: "往来单位不能为空", trigger: "blur" }]
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
  // 仅销售退货按折扣率算实收 = 售价×数量×(折扣/100)；采购退货无折扣
  if (!isPurchaseReturn.value) {
    const d = Number(row.discount) || 100
    return (qty * price * d / 100).toFixed(2)
  }
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
  form.value.items.push({ productId: undefined, productName: '', spec: '', unit: '箱', qty: 1, price: 0, discount: 100 })
}

function removeItem(index) {
  form.value.items.splice(index, 1)
}

function getList() {
  loading.value = true
  const p = { ...queryParams.value }
  // 往来单位按类型拆解为后端可识别的 supplierName/customerName
  delete p.partnerName
  if (queryParams.value.returnType === '1') p.supplierName = queryParams.value.partnerName
  else if (queryParams.value.returnType === '2') p.customerName = queryParams.value.partnerName
  listReturn(p).then(res => {
    loading.value = false
    returnList.value = res.rows
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
  ids.value = selection.map(item => item.returnId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

function handleDelete(row) {
  const returnIds = row.returnId || ids.value
  proxy.$modal.confirm('是否确认删除退货单编号为"' + returnIds + '"的数据项？').then(function () {
    return delReturn(returnIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function reset() {
  form.value = {
    returnId: undefined,
    returnNo: undefined,
    sourceId: undefined,
    sourceNo: undefined,
    returnType: '1',
    supplierId: undefined,
    supplierName: undefined,
    customerId: undefined,
    customerName: undefined,
    returnDate: today(),
    status: '0',
    remark: undefined,
    items: []
  }
  proxy.resetForm("returnRef")
}

function cancel() {
  open.value = false
  reset()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "添加退货单"
  // 打开新增对话框时刷新「来源单据」下拉（已入库采购单/已出库销售单）
  reloadSourceOptions()
}

function handleUpdate(row) {
  reset()
  const returnId = row.returnId || ids.value
  getReturn(returnId).then(res => {
    form.value = res.data
    form.value.partnerId = form.value.returnType === '1' ? form.value.supplierId : form.value.customerId
    if (!form.value.items) form.value.items = []
    open.value = true
    title.value = "修改退货单"
  })
}

function handleDetail(row) {
  getReturn(row.returnId).then(res => {
    Object.assign(detail, res.data)
    if (!detail.items) detail.items = []
    detailOpen.value = true
  })
}

// 一键退货 / 撤销退货：取全量(含明细)翻转状态后保存，复用已验证的库存联动
function handleApply(row) {
  const tip = row.returnType === '1'
    ? '确认执行「' + row.returnNo + '」采购退货？将扣减对应商品库存（货退给供应商）。'
    : '确认执行「' + row.returnNo + '」销售退货？将增加对应商品库存（客户退货入库）。'
  proxy.$modal.confirm(tip).then(() => {
    getReturn(row.returnId).then(res => {
      const d = res.data
      d.status = '1'
      updateReturn(d).then(() => { proxy.$modal.msgSuccess('已退货'); getList() })
    })
  }).catch(() => {})
}
function handleReverse(row) {
  const tip = row.returnType === '1'
    ? '确认撤销采购退货「' + row.returnNo + '」？将回补对应商品库存。'
    : '确认撤销销售退货「' + row.returnNo + '」？将扣减回补的商品库存。'
  proxy.$modal.confirm(tip).then(() => {
    getReturn(row.returnId).then(res => {
      const d = res.data
      d.status = '0'
      updateReturn(d).then(() => { proxy.$modal.msgSuccess('已撤销退货'); getList() })
    })
  }).catch(() => {})
}

function submitForm() {
  proxy.$refs["returnRef"].validate(valid => {
    if (valid) {
      if (!form.value.items || form.value.items.length === 0) {
        proxy.$modal.msgWarning("请至少添加一条明细")
        return
      }
      if (!form.value.items.some(it => it.productId != undefined)) {
        proxy.$modal.msgWarning("请为明细选择商品")
        return
      }
      const payload = JSON.parse(JSON.stringify(form.value))
      delete payload.partnerId
      payload.totalAmount = computedTotal.value
      if (form.value.returnType === '1') { payload.customerId = undefined; payload.customerName = undefined }
      else { payload.supplierId = undefined; payload.supplierName = undefined }
      if (form.value.returnId != undefined) {
        updateReturn(payload).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addReturn(payload).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

// 切换退货类型后，若已选往来单位不在该类型范围内则清空
watch(() => queryParams.value.returnType, (t) => {
  const name = queryParams.value.partnerName
  if (!name) return
  const valid = t === '1'
    ? supplierOptions.value.some(s => s.supplierName === name)
    : (t === '2' ? customerOptions.value.some(c => c.customerName === name) : true)
  if (!valid) queryParams.value.partnerName = undefined
})

onMounted(() => {
  getList()
  loadSuppliers()
  loadCustomers()
  loadProducts()
  // 支持从采购/销售页点「退货」跳转带来源单进入，自动打开新增退货并带出明细
  const q = route.query
  if (q && q.sourceId) {
    handleAddFromSource(q)
  }
})
</script>

<style scoped lang="scss">
.mb8 { margin-bottom: 8px; }
</style>
