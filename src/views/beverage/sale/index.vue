<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="出库单号" prop="saleNo">
        <el-input v-model="queryParams.saleNo" placeholder="请输入单号" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="客户" prop="customerName">
        <el-select v-model="queryParams.customerName" placeholder="全部客户" clearable filterable style="width: 180px" @change="handleQuery">
          <el-option v-for="c in customerOptions" :key="c.customerId" :label="c.customerName" :value="c.customerName" />
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['beverage:sale:add']">新增出库单</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single || editLocked" :title="editLocked ? '已出库或已产生退货的销售单不可修改，请先撤销出库' : ''" @click="handleUpdate" v-hasPermi="['beverage:sale:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple || deleteLocked" :title="deleteLocked ? '已出库或已产生退货的销售单不可删除，请先撤销出库' : ''" @click="handleDelete" v-hasPermi="['beverage:sale:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="saleList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="单号" align="center" prop="saleNo" width="170" />
      <el-table-column label="客户" align="center" prop="customerName" :show-overflow-tooltip="true" />
      <el-table-column label="出库日期" align="center" prop="saleDate" width="120" />
      <el-table-column label="总金额" align="center" prop="totalAmount" width="120">
        <template #default="scope">¥ {{ formatMoney(scope.row.totalAmount) }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="120">
        <template #default="scope">
          <el-tag v-if="scope.row.returnStatus === '3'" type="info">已退货</el-tag>
          <el-tag v-else-if="scope.row.returnStatus === '2'" type="warning">
            部分退货 {{ scope.row.returnQty }}/{{ scope.row.totalQty }}
          </el-tag>
          <el-tag v-else-if="scope.row.returnStatus === '1'" type="warning">退货中</el-tag>
          <el-tag v-else :type="scope.row.status === '0' ? 'warning' : 'success'">{{ scope.row.status === '0' ? '待出库' : '已出库' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="240" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)">明细</el-button>
          <el-button v-if="scope.row.status === '0'" link type="success" icon="Bottom" @click="handleOutbound(scope.row)" v-hasPermi="['beverage:sale:edit']">出库</el-button>
          <el-button v-if="scope.row.status === '1'" link type="danger" icon="RefreshLeft" @click="goReturn(scope.row)" :disabled="returning || allReturned(scope.row)" :title="allReturned(scope.row) ? '该单已全部退货，无剩余可退数量' : ''" v-hasPermi="['beverage:return:add']">退货</el-button>
          <el-button v-if="scope.row.status === '1' && isAdmin" link type="warning" icon="Top" @click="handleReverseOutbound(scope.row)" :disabled="hasReturn(scope.row)" :title="hasReturn(scope.row) ? '该单已产生退货记录，不可撤销出库；如需调整请通过「销售退货单」处理' : ''" v-hasPermi="['beverage:sale:edit']">撤销出库</el-button>
          <el-button v-if="scope.row.status === '0' && !hasReturn(scope.row)" link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['beverage:sale:edit']">修改</el-button>
          <el-button v-if="scope.row.status === '0' && !hasReturn(scope.row)" link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['beverage:sale:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加/修改出库单对话框 -->
    <el-dialog :title="title" v-model="open" width="900px" append-to-body>
      <el-form :model="form" :rules="rules" ref="saleRef" label-width="100px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="客户" prop="customerName">
              <el-select v-model="form.customerId" placeholder="请选择客户" filterable style="width:100%" @change="onCustomerChange">
                <el-option v-for="c in customerOptions" :key="c.customerId" :label="c.customerName" :value="c.customerId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出库日期" prop="saleDate">
              <el-date-picker v-model="form.saleDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio value="0">待出库</el-radio>
                <el-radio value="1" :disabled="!isAdmin" :title="!isAdmin ? '仅超管可直接登记为已出库，普通用户请先保存待出库再执行「出库」' : ''">已出库</el-radio>
              </el-radio-group>
              <div v-if="!isAdmin" style="color:#909399;font-size:12px;line-height:1.4;">普通用户只能保存为「待出库」，出库请点列表行「出库」按钮；已出库单据如需纠错请用「退货」</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单据金额">
              <span style="color:#f56c6c;font-weight:bold;">¥ {{ formatMoney(computedTotal) }}</span>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">出库明细</el-divider>
        <el-button type="primary" plain icon="Plus" size="small" @click="addItem" style="margin-bottom:8px">添加明细</el-button>
        <el-table :data="form.items" border>
          <el-table-column label="商品" min-width="170">
            <template #default="scope">
              <el-select v-model="scope.row.productId" placeholder="选择商品" filterable style="width:100%" @change="(val) => onProductChange(scope.row, val)">
                <el-option v-for="p in productOptions" :key="p.productId" :label="p.productName" :value="p.productId" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="规格" width="100">
            <template #default="scope"><span>{{ scope.row.spec || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="单位" width="70">
            <template #default="scope"><span>{{ scope.row.unit || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="数量" width="105">
            <template #default="scope">
              <el-input-number v-model="scope.row.qty" :min="1" :precision="0" :controls-position="'right'" style="width:100%" @change="recalc" />
            </template>
          </el-table-column>
          <el-table-column label="售价" width="95">
            <template #default="scope"><span>¥ {{ formatMoney(scope.row.price) }}</span></template>
          </el-table-column>
          <el-table-column label="折扣%" width="95">
            <template #default="scope">
              <el-input-number v-model="scope.row.discount" :min="1" :max="100" :precision="0" :step="5" :controls-position="'right'" style="width:100%" @change="recalc" />
            </template>
          </el-table-column>
          <el-table-column label="实收金额" width="105" align="center">
            <template #default="scope"><span>¥ {{ formatMoney(itemAmount(scope.row)) }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center">
            <template #default="scope"><el-button link type="danger" icon="Delete" @click="removeItem(scope.$index)" /></template>
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
    <el-dialog title="出库单明细" v-model="detailOpen" width="800px" append-to-body>
      <el-descriptions :column="3" border size="small" style="margin-bottom:12px">
        <el-descriptions-item label="单号">{{ detail.saleNo }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ detail.customerName }}</el-descriptions-item>
        <el-descriptions-item label="日期">{{ detail.saleDate }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥ {{ formatMoney(detail.totalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status === '0' ? '待出库' : '已出库' }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detail.items" border>
        <el-table-column label="商品名称" prop="productName" />
        <el-table-column label="规格" prop="spec" width="110" />
        <el-table-column label="单位" prop="unit" width="70" />
        <el-table-column label="数量" prop="qty" width="80" align="center" />
        <el-table-column label="售价" width="90" align="center"><template #default="s">¥ {{ formatMoney(s.row.price) }}</template></el-table-column>
        <el-table-column label="折扣" width="80" align="center"><template #default="s">{{ s.row.discount != null ? s.row.discount + '%' : '100%' }}</template></el-table-column>
        <el-table-column label="实收" width="100" align="center"><template #default="s">¥ {{ formatMoney(s.row.amount) }}</template></el-table-column>
      </el-table>
    </el-dialog>

    <!-- 退货预览确认：先预览原单可退商品并调整数量，确认后再生成退货单（不再一键直接生成） -->
    <ReturnPreviewDialog v-model="returnOpen" source-type="2" :source-id="returnRow.saleId" :source-no="returnRow.saleNo" @success="getList" />
  </div>
</template>

<script setup name="BeverageSale">
import { listSale, getSale, delSale, addSale, updateSale } from "@/api/beverage/sale"
import { listCustomer } from "@/api/beverage/customer"
import { listProduct } from "@/api/beverage/product"
import ReturnPreviewDialog from "@/views/beverage/components/ReturnPreviewDialog.vue"
import { parseTime } from "@/utils/ruoyi"
import useUserStore from '@/store/modules/user'

const { proxy } = getCurrentInstance()

// 仅超管可：撤销出库、修改/删除已出库单据、直接登记为已出库
const isAdmin = computed(() => {
  const roles = useUserStore().roles || []
  return roles.includes('admin')
})

// 退货状态：已产生退货记录的单据不可再撤销出库/修改/删除（后端亦硬拦截）
// returnStatus: 0未退货 1退货中 2部分退货 3已退货(全部退完)
const hasReturn = (row) => !!row.returnStatus && row.returnStatus !== '0'
const allReturned = (row) => row.returnStatus === '3'

// 已出库（或已产生退货）的单据不可修改/删除：需先由超管「撤销出库」回到待出库态
const lockedRow = (row) => !!row && (row.status === '1' || hasReturn(row))
const selectedRows = ref([])
const editLocked = computed(() => selectedRows.value.length === 1 && lockedRow(selectedRows.value[0]))
const deleteLocked = computed(() => selectedRows.value.some(lockedRow))

// 关联下拉数据
const customerOptions = ref([])
const productOptions = ref([])

function loadCustomers() {
  listCustomer({ pageNum: 1, pageSize: 10000 }).then(res => { customerOptions.value = res.rows || [] })
}
function loadProducts() {
  listProduct({ pageNum: 1, pageSize: 10000 }).then(res => { productOptions.value = res.rows || [] })
}
function onCustomerChange(val) {
  const c = customerOptions.value.find(x => x.customerId === val)
  form.value.customerName = c ? c.customerName : ''
}
function onProductChange(row, val) {
  const p = productOptions.value.find(x => x.productId === val)
  if (!p) return
  row.productId = p.productId
  row.productName = p.productName
  row.spec = p.spec
  row.unit = p.unit
  row.price = p.salePrice != null ? Number(p.salePrice) : 0
  if (row.discount == null || row.discount === 0) row.discount = 100
  if (!row.qty) row.qty = 1
}

const saleList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const detail = reactive({ saleNo: '', customerName: '', saleDate: '', status: '', totalAmount: 0, items: [] })

const statusOptions = ref([
  { label: '待出库', value: '0' },
  { label: '已出库', value: '1' }
])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    saleNo: undefined,
    customerName: undefined,
    status: undefined
  },
  rules: {
    customerName: [{ required: true, message: "客户名称不能为空", trigger: "blur" }],
    saleDate: [{ required: true, message: "出库日期不能为空", trigger: "change" }]
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
  const disc = (row.discount == null || Number(row.discount) === 0) ? 100 : Number(row.discount)
  return (qty * price * disc / 100).toFixed(2)
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
  form.value.items.push({ productId: undefined, productName: '', spec: '', unit: '箱', discount: 100, qty: 1, price: 0 })
}

function removeItem(index) {
  form.value.items.splice(index, 1)
}

function getList() {
  loading.value = true
  listSale(queryParams.value).then(res => {
    loading.value = false
    saleList.value = res.rows
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
  ids.value = selection.map(item => item.saleId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

function handleDelete(row) {
  // 已出库/已退货单据禁止删除（后端同样硬拦截），需先撤销出库
  if (row && lockedRow(row)) {
    proxy.$modal.msgWarning('已出库的销售单不可删除，请先撤销出库')
    return
  }
  if (!row && selectedRows.value.some(lockedRow)) {
    proxy.$modal.msgWarning('所选单据中包含已出库或已退货的销售单，请先撤销出库')
    return
  }
  const saleIds = row.saleId || ids.value
  proxy.$modal.confirm('是否确认删除出库单编号为"' + saleIds + '"的数据项？').then(function () {
    return delSale(saleIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function reset() {
  form.value = {
    saleId: undefined,
    saleNo: undefined,
    customerName: undefined,
    saleDate: undefined,
    status: '0',
    remark: undefined,
    items: []
  }
  proxy.resetForm("saleRef")
}

function cancel() {
  open.value = false
  reset()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "添加出库单"
}

function handleUpdate(row) {
  // 已出库/已退货单据禁止修改（后端同样硬拦截），需先撤销出库
  const target = row || (selectedRows.value.length === 1 ? selectedRows.value[0] : null)
  if (target && lockedRow(target)) {
    proxy.$modal.msgWarning('已出库的销售单不可修改，请先撤销出库')
    return
  }
  reset()
  const saleId = row.saleId || ids.value
  getSale(saleId).then(res => {
    form.value = res.data
    if (!form.value.items) form.value.items = []
    open.value = true
    title.value = "修改出库单"
  })
}

function handleDetail(row) {
  getSale(row.saleId).then(res => {
    Object.assign(detail, res.data)
    if (!detail.items) detail.items = []
    detailOpen.value = true
  })
}

// 一键出库 / 撤销出库：取全量(含明细)翻转状态后保存，复用已验证的库存联动
function handleOutbound(row) {
  proxy.$modal.confirm('确认将出库单「' + row.saleNo + '」出库？将扣减对应商品库存。').then(() => {
    getSale(row.saleId).then(res => {
      const d = res.data
      d.status = '1'
      updateSale(d).then(() => { proxy.$modal.msgSuccess('已出库'); getList() })
    })
  }).catch(() => {})
}
function handleReverseOutbound(row) {
  proxy.$modal.confirm('确认撤销出库单「' + row.saleNo + '」出库？将回退对应商品库存。').then(() => {
    getSale(row.saleId).then(res => {
      const d = res.data
      d.status = '0'
      updateSale(d).then(() => { proxy.$modal.msgSuccess('已撤销出库'); getList() })
    })
  }).catch(() => {})
}

// 退货：先弹出预览（可勾选商品、调整数量/折扣/备注），用户确认后才生成退货单
const returning = ref(false)
const returnOpen = ref(false)
const returnRow = reactive({ saleId: undefined, saleNo: '' })
function goReturn(row) {
  if (returning.value) return
  returnRow.saleId = row.saleId
  returnRow.saleNo = row.saleNo
  returnOpen.value = true
}

function submitForm() {
  proxy.$refs["saleRef"].validate(valid => {
    if (valid) {
      const payload = JSON.parse(JSON.stringify(form.value))
      payload.totalAmount = computedTotal.value
      if (form.value.saleId != undefined) {
        updateSale(payload).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addSale(payload).then(() => {
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
  loadCustomers()
  loadProducts()
})
</script>

<style scoped lang="scss">
.mb8 { margin-bottom: 8px; }
</style>
