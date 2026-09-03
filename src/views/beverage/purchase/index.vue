<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="进货单号" prop="purchaseNo">
        <el-input v-model="queryParams.purchaseNo" placeholder="请输入单号" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="供应商" prop="supplierName">
        <el-select v-model="queryParams.supplierName" placeholder="全部供应商" clearable filterable style="width: 180px" @change="handleQuery">
          <el-option v-for="s in supplierOptions" :key="s.supplierId" :label="s.supplierName" :value="s.supplierName" />
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['beverage:purchase:add']">新增进货单</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['beverage:purchase:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['beverage:purchase:remove']">删除</el-button>
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
      <el-table-column label="状态" align="center" prop="status" width="120">
        <template #default="scope">
          <el-tag v-if="scope.row.returnStatus === '3'" type="info">已退货</el-tag>
          <el-tag v-else-if="scope.row.returnStatus === '2'" type="warning">
            部分退货 {{ scope.row.returnQty }}/{{ scope.row.totalQty }}
          </el-tag>
          <el-tag v-else-if="scope.row.returnStatus === '1'" type="warning">退货中</el-tag>
          <el-tag v-else :type="scope.row.status === '0' ? 'warning' : 'success'">{{ scope.row.status === '0' ? '待入库' : '已入库' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="240" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)">明细</el-button>
          <el-button v-if="scope.row.status === '0'" link type="success" icon="Bottom" @click="handleInbound(scope.row)" v-hasPermi="['beverage:purchase:edit']">入库</el-button>
          <el-button v-if="scope.row.status === '1'" link type="danger" icon="RefreshLeft" @click="goReturn(scope.row)" :disabled="returning || allReturned(scope.row)" :title="allReturned(scope.row) ? '该单已全部退货，无剩余可退数量' : ''" v-hasPermi="['beverage:return:add']">退货</el-button>
          <el-button v-if="scope.row.status === '1' && isAdmin" link type="warning" icon="Top" @click="handleReverseInbound(scope.row)" :disabled="hasReturn(scope.row)" :title="hasReturn(scope.row) ? '该单已产生退货记录，不可撤销入库；如需调整请通过「采购退货单」处理' : ''" v-hasPermi="['beverage:purchase:edit']">撤销入库</el-button>
          <el-button v-if="(scope.row.status === '0' || isAdmin) && !hasReturn(scope.row)" link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['beverage:purchase:edit']">修改</el-button>
          <el-button v-if="(scope.row.status === '0' || isAdmin) && !hasReturn(scope.row)" link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['beverage:purchase:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加/修改进货单对话框 -->
    <el-dialog :title="title" v-model="open" width="900px" append-to-body>
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
          <el-table-column label="商品" min-width="180">
            <template #default="scope">
              <el-select v-model="scope.row.productId" placeholder="选择商品" filterable style="width:100%" @change="(val) => onProductChange(scope.row, val)">
                <el-option v-for="p in productOptions" :key="p.productId" :label="p.productName" :value="p.productId" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="规格" width="110">
            <template #default="scope"><span>{{ scope.row.spec || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="单位" width="80">
            <template #default="scope"><span>{{ scope.row.unit || '-' }}</span></template>
          </el-table-column>
          <el-table-column label="数量" width="110">
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
    <el-dialog title="进货单明细" v-model="detailOpen" width="800px" append-to-body>
      <el-descriptions :column="3" border size="small" style="margin-bottom:12px">
        <el-descriptions-item label="单号">{{ detail.purchaseNo }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ detail.supplierName }}</el-descriptions-item>
        <el-descriptions-item label="日期">{{ detail.purchaseDate }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥ {{ formatMoney(detail.totalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status === '0' ? '待入库' : '已入库' }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detail.items" border>
        <el-table-column label="商品名称" prop="productName" />
        <el-table-column label="规格" prop="spec" width="110" />
        <el-table-column label="单位" prop="unit" width="70" />
        <el-table-column label="数量" prop="qty" width="80" align="center" />
        <el-table-column label="单价" width="100" align="center"><template #default="s">¥ {{ formatMoney(s.row.price) }}</template></el-table-column>
        <el-table-column label="金额" width="110" align="center"><template #default="s">¥ {{ formatMoney(s.row.amount) }}</template></el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup name="BeveragePurchase">
import { listPurchase, getPurchase, delPurchase, addPurchase, updatePurchase } from "@/api/beverage/purchase"
import { listSupplier } from "@/api/beverage/supplier"
import { listProduct } from "@/api/beverage/product"
import { autoCreateReturn } from "@/api/beverage/return"
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
  form.value.items.push({ productId: undefined, productName: '', spec: '', unit: '箱', qty: 1, price: 0 })
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
  ids.value = selection.map(item => item.purchaseId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

function handleDelete(row) {
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
  reset()
  const purchaseId = row.purchaseId || ids.value
  getPurchase(purchaseId).then(res => {
    form.value = res.data
    if (!form.value.items) form.value.items = []
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

// 一键退货：自动按原采购单生成「采购退货单」并联动库存，无需手动填写表单
const returning = ref(false)
function goReturn(row) {
  if (returning.value) return
  proxy.$modal.confirm('确认对采购单「' + row.purchaseNo + '」执行退货？将自动生成采购退货单并扣减库存（退回全部商品）。').then(() => {
    returning.value = true
    autoCreateReturn({ returnType: '1', sourceId: row.purchaseId }).then(() => {
      proxy.$modal.msgSuccess('退货单已自动创建并执行')
      getList()
    }).catch(() => {}).finally(() => { returning.value = false })
  }).catch(() => {})
}

function submitForm() {
  proxy.$refs["purchaseRef"].validate(valid => {
    if (valid) {
      const payload = JSON.parse(JSON.stringify(form.value))
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
