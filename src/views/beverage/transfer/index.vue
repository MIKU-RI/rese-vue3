<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="76px">
      <el-form-item label="调拨单号" prop="transferNo">
        <el-input v-model="queryParams.transferNo" placeholder="请输入单号" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="调出仓" prop="fromWarehouseId">
        <el-select v-model="queryParams.fromWarehouseId" placeholder="调出仓" clearable filterable style="width: 160px" @change="handleQuery">
          <el-option v-for="w in warehouseOpts" :key="'f'+w.warehouseId" :label="w.warehouseName" :value="w.warehouseId" />
        </el-select>
      </el-form-item>
      <el-form-item label="调入仓" prop="toWarehouseId">
        <el-select v-model="queryParams.toWarehouseId" placeholder="调入仓" clearable filterable style="width: 160px" @change="handleQuery">
          <el-option v-for="w in warehouseOpts" :key="'t'+w.warehouseId" :label="w.warehouseName" :value="w.warehouseId" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 140px">
          <el-option v-for="dict in statusOptions" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="调拨日期" prop="transferDate">
        <el-date-picker v-model="queryParams.transferDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" placeholder="选择日期" style="width: 160px" @change="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['beverage:transfer:add']">新增调拨单</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single || editLocked" :title="editLocked ? '已调拨的调拨单不可修改，请先执行「撤销调拨」' : ''" @click="handleUpdate" v-hasPermi="['beverage:transfer:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['beverage:transfer:list']">导出</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple || deleteLocked" :title="deleteLocked ? '已调拨的调拨单不可删除，请先执行「撤销调拨」' : ''" @click="handleDelete" v-hasPermi="['beverage:transfer:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="transferList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="调拨单号" align="center" prop="transferNo" width="180" />
      <el-table-column label="调出仓" align="center" prop="fromWarehouseName" :show-overflow-tooltip="true" />
      <el-table-column label="调入仓" align="center" prop="toWarehouseName" :show-overflow-tooltip="true" />
      <el-table-column label="调拨日期" align="center" prop="transferDate" width="120" />
      <el-table-column label="总数量" align="center" prop="totalQty" width="110" />
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.status === '0' ? 'warning' : 'success'">{{ scope.row.status === '0' ? '待调拨' : '已调拨' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="220" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button v-if="scope.row.status === '1'" link type="primary" icon="View" @click="handleDetail(scope.row)">明细</el-button>
          <el-button v-if="scope.row.status === '0'" link type="success" icon="Top" @click="handleApply(scope.row)" v-hasPermi="['beverage:transfer:edit']">执行调拨</el-button>
          <el-button v-if="scope.row.status === '1'" link type="warning" icon="Bottom" @click="handleReverse(scope.row)" v-hasPermi="['beverage:transfer:edit']">撤销调拨</el-button>
          <el-button v-if="scope.row.status === '0'" link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['beverage:transfer:edit']">修改</el-button>
          <el-button v-if="scope.row.status === '0'" link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['beverage:transfer:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加/修改调拨单对话框 -->
    <el-dialog :title="title" v-model="open" width="920px" append-to-body>
      <el-form :model="form" :rules="rules" ref="transferRef" label-width="100px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="调出仓" prop="fromWarehouseId">
              <el-select v-model="form.fromWarehouseId" placeholder="请选择调出仓" filterable style="width:100%" @change="onFromWhChange">
                <el-option v-for="w in warehouseOpts" :key="w.warehouseId" :label="w.warehouseName" :value="w.warehouseId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="调入仓" prop="toWarehouseId">
              <el-select v-model="form.toWarehouseId" placeholder="请选择调入仓" filterable style="width:100%">
                <el-option v-for="w in warehouseOpts" :key="w.warehouseId" :label="w.warehouseName" :value="w.warehouseId" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="调拨日期" prop="transferDate">
              <el-date-picker v-model="form.transferDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总数量">
              <span style="color:#409eff;font-weight:bold;">{{ computedTotal }} 件</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio value="0">待调拨（仅登记，不动库存）</el-radio>
                <el-radio value="1">已调拨（立即联动库存：出仓减、入仓加）</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="1" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">调拨明细（规格/单位不可修改，仅数量可调整；批次号留空=按最早到期批次 FIFO 扣减）</el-divider>
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
          <el-table-column label="批次号" min-width="200">
            <template #default="scope">
              <el-select v-model="scope.row.batchNo" placeholder="留空=FIFO最早" clearable filterable style="width:100%"
                         :disabled="!form.fromWarehouseId || !scope.row.productId" @visible-change="(v) => { if (v) loadRowBatches(scope.row) }">
                <el-option v-for="b in (scope.row.batchOptions || [])" :key="b.batchNo" :label="batchLabel(b)" :value="b.batchNo" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="数量" width="130">
            <template #default="scope">
              <el-input-number v-model="scope.row.qty" :min="1" :precision="0" :controls-position="'right'" style="width:100%" @change="recalc" />
            </template>
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
          <el-button type="primary" @click="submitForm" :disabled="submitting">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 明细查看对话框 -->
    <el-dialog title="调拨单明细" v-model="detailOpen" width="840px" append-to-body>
      <el-descriptions :column="3" border size="small" style="margin-bottom:12px">
        <el-descriptions-item label="单号">{{ detail.transferNo }}</el-descriptions-item>
        <el-descriptions-item label="调出仓">{{ detail.fromWarehouseName }}</el-descriptions-item>
        <el-descriptions-item label="调入仓">{{ detail.toWarehouseName }}</el-descriptions-item>
        <el-descriptions-item label="调拨日期">{{ detail.transferDate }}</el-descriptions-item>
        <el-descriptions-item label="总数量">{{ detail.totalQty }} 件</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status === '0' ? '待调拨' : '已调拨' }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detail.items" border>
        <el-table-column label="商品名称" prop="productName" />
        <el-table-column label="规格" prop="spec" width="120" />
        <el-table-column label="单位" prop="unit" width="70" />
        <el-table-column label="批次号" width="140">
          <template #default="s"><span>{{ s.row.batchNo || 'FIFO' }}</span></template>
        </el-table-column>
        <el-table-column label="数量" prop="qty" width="90" align="center" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup name="BeverageTransfer">
import { listTransfer, getTransfer, addTransfer, updateTransfer, delTransfer } from "@/api/beverage/transfer"
import { listProduct } from "@/api/beverage/product"
import { listBatch } from "@/api/beverage/batch"
import { warehouseOptions } from "@/api/beverage/warehouse"
import { parseTime } from "@/utils/ruoyi"

const { proxy } = getCurrentInstance()

const productOptions = ref([])
const warehouseOpts = ref([])
function loadWarehouses() {
  warehouseOptions().then(res => { warehouseOpts.value = res.data || res.rows || [] }).catch(() => {})
}
function loadProducts() {
  listProduct({ pageNum: 1, pageSize: 10000 }).then(res => { productOptions.value = res.rows || [] })
}

// 提交中标记：防止重复点击导致并发重复提交
const submitting = ref(false)

function onProductChange(row, val) {
  const p = productOptions.value.find(x => x.productId === val)
  if (!p) return
  row.productId = p.productId
  row.productName = p.productName
  row.spec = p.spec
  row.unit = p.unit
  row.batchOptions = []
  row.batchNo = undefined
  if (!row.qty) row.qty = 1
  // 调出仓已选时，带出该商品在调出仓的批次
  if (form.value.fromWarehouseId) loadRowBatches(row)
}

// 调出仓变化：逐个刷新明细行的可选批次（批次按 (仓库,商品) 维度）
function onFromWhChange() {
  if (form.value.items && form.value.items.length) {
    form.value.items.forEach(it => { it.batchOptions = []; it.batchNo = undefined; if (it.productId) loadRowBatches(it) })
  }
}

// 按 (商品, 调出仓) 拉取可选批次，供明细行批次下拉
function loadRowBatches(row) {
  if (!row.productId || !form.value.fromWarehouseId) { row.batchOptions = []; return }
  listBatch({ productId: row.productId, warehouseId: form.value.fromWarehouseId, pageSize: 1000 }).then(res => {
    const list = res.rows || res.data || []
    row.batchOptions = list.filter(b => b.qty > 0)
  }).catch(() => { row.batchOptions = [] })
}
function batchLabel(b) {
  const exp = b.expiryDate ? (' · 到期 ' + b.expiryDate) : ''
  const q = b.qty != null ? (' · 余 ' + b.qty) : ''
  return b.batchNo + exp + q
}

const transferList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const detail = reactive({ transferNo: '', fromWarehouseName: '', toWarehouseName: '', transferDate: '', status: '', totalQty: 0, items: [] })

const statusOptions = ref([
  { label: '待调拨', value: '0' },
  { label: '已调拨', value: '1' }
])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    transferNo: undefined,
    fromWarehouseId: undefined,
    toWarehouseId: undefined,
    status: undefined,
    transferDate: undefined
  },
  rules: {
    fromWarehouseId: [{ required: true, message: "调出仓不能为空", trigger: "change" }],
    toWarehouseId: [{ required: true, message: "调入仓不能为空", trigger: "change" }],
    transferDate: [{ required: true, message: "调拨日期不能为空", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

const computedTotal = computed(() => {
  if (!form.value.items) return 0
  let t = 0
  form.value.items.forEach(it => { t += Number(it.qty) || 0 })
  return t
})

function recalc() { /* 触发 computedTotal 刷新 */ }

function addItem() {
  if (!form.value.items) form.value.items = []
  form.value.items.push({ productId: undefined, productName: '', spec: '', unit: '箱', batchNo: undefined, batchOptions: [], qty: 1, remark: '' })
}

function removeItem(index) {
  form.value.items.splice(index, 1)
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("beverage/transfer/export", { ...queryParams.value }, `transfer_${new Date().getTime()}.xlsx`)
}

function getList() {
  loading.value = true
  listTransfer(queryParams.value).then(res => {
    loading.value = false
    transferList.value = res.rows
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
  ids.value = selection.map(item => item.transferId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

// 已调拨（库存已联动）的调拨单不可修改/删除：需先执行「撤销调拨」回到待调拨态
const lockedRow = (row) => !!row && row.status === '1'
const selectedRows = ref([])
const editLocked = computed(() => selectedRows.value.length === 1 && lockedRow(selectedRows.value[0]))
const deleteLocked = computed(() => selectedRows.value.some(lockedRow))

function handleDelete(row) {
  if (row && lockedRow(row)) {
    proxy.$modal.msgWarning('已调拨的调拨单不可删除，请先执行「撤销调拨」')
    return
  }
  if (!row && selectedRows.value.some(lockedRow)) {
    proxy.$modal.msgWarning('所选调拨单中包含已调拨的单据，请先执行「撤销调拨」')
    return
  }
  const transferIds = row.transferId || ids.value
  proxy.$modal.confirm('是否确认删除调拨单编号为"' + transferIds + '"的数据项？').then(function () {
    return delTransfer(transferIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function reset() {
  form.value = {
    transferId: undefined,
    transferNo: undefined,
    fromWarehouseId: undefined,
    toWarehouseId: undefined,
    transferDate: today(),
    totalQty: 0,
    status: '0',
    remark: undefined,
    items: []
  }
  proxy.resetForm("transferRef")
}

function today() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

function cancel() {
  open.value = false
  reset()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "添加调拨单"
}

function handleUpdate(row) {
  const target = row || (selectedRows.value.length === 1 ? selectedRows.value[0] : null)
  if (target && lockedRow(target)) {
    proxy.$modal.msgWarning('已调拨的调拨单不可修改，请先执行「撤销调拨」')
    return
  }
  reset()
  const transferId = row.transferId || ids.value
  getTransfer(transferId).then(res => {
    form.value = res.data
    if (!form.value.items) form.value.items = []
    form.value.items.forEach(it => { it.batchOptions = [] })
    open.value = true
    title.value = "修改调拨单"
  })
}

function handleDetail(row) {
  getTransfer(row.transferId).then(res => {
    Object.assign(detail, res.data)
    if (!detail.items) detail.items = []
    detailOpen.value = true
  })
}

// 一键执行调拨 / 撤销调拨：取全量(含明细)翻转状态后保存，复用后端已验证的库存+批次联动
function handleApply(row) {
  proxy.$modal.confirm('确认执行「' + row.transferNo + '」调拨？将从「' + row.fromWarehouseName + '」扣减并调入「' + row.toWarehouseName + '」。').then(() => {
    getTransfer(row.transferId).then(res => {
      const d = res.data
      d.status = '1'
      updateTransfer(d).then(() => { proxy.$modal.msgSuccess('已调拨'); getList() })
    })
  }).catch(() => {})
}
function handleReverse(row) {
  proxy.$modal.confirm('确认撤销调拨「' + row.transferNo + '」？将回补调出仓库存、冲减调入仓库存。').then(() => {
    getTransfer(row.transferId).then(res => {
      const d = res.data
      d.status = '0'
      updateTransfer(d).then(() => { proxy.$modal.msgSuccess('已撤销调拨'); getList() })
    })
  }).catch(() => {})
}

function submitForm() {
  proxy.$refs["transferRef"].validate(valid => {
    if (valid) {
      if (!form.value.items || form.value.items.length === 0) {
        proxy.$modal.msgWarning("请至少添加一条明细")
        return
      }
      if (!form.value.items.some(it => it.productId != undefined || it.productName)) {
        proxy.$modal.msgWarning("请为明细选择商品")
        return
      }
      if (form.value.fromWarehouseId && form.value.toWarehouseId && form.value.fromWarehouseId === form.value.toWarehouseId) {
        proxy.$modal.msgWarning("调出仓与调入仓不能相同")
        return
      }
      const payload = {
        transferId: form.value.transferId,
        fromWarehouseId: form.value.fromWarehouseId,
        toWarehouseId: form.value.toWarehouseId,
        transferDate: form.value.transferDate,
        status: form.value.status,
        remark: form.value.remark,
        items: form.value.items.map(it => ({
          itemId: it.itemId,
          productId: it.productId,
          productName: it.productName,
          spec: it.spec,
          unit: it.unit,
          batchNo: it.batchNo || null,
          qty: it.qty,
          remark: it.remark
        }))
      }
      if (form.value.transferId != undefined) {
        submitting.value = true
        updateTransfer(payload).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        }).catch(() => {}).finally(() => { submitting.value = false })
      } else {
        submitting.value = true
        addTransfer(payload).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        }).catch(() => {}).finally(() => { submitting.value = false })
      }
    }
  })
}

onMounted(() => {
  getList()
  loadProducts()
  loadWarehouses()
})
</script>

<style scoped lang="scss">
.mb8 { margin-bottom: 8px; }
</style>
