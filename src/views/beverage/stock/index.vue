<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="商品名称" prop="productName">
        <el-select v-model="queryParams.productName" placeholder="全部商品" clearable filterable style="width: 200px" @change="handleQuery">
          <el-option v-for="p in productOptions" :key="p.productId" :label="p.productName" :value="p.productName" />
        </el-select>
      </el-form-item>
      <el-form-item label="品牌" prop="brand">
        <el-select v-model="queryParams.brand" placeholder="全部品牌" clearable filterable style="width: 160px" @change="handleQuery">
          <el-option v-for="o in beverage_brand" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="变动类型" prop="changeType">
        <el-select v-model="queryParams.changeType" placeholder="类型" clearable style="width: 140px">
          <el-option v-for="dict in typeOptions" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['beverage:stock:add']">新增流水</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['beverage:stock:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="stockList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="流水ID" align="center" prop="stockId" width="90" />
      <el-table-column label="商品名称" align="center" prop="productName" :show-overflow-tooltip="true" />
      <el-table-column label="规格" align="center" prop="spec" width="110" />
      <el-table-column label="单位" align="center" prop="unit" width="70" />
      <el-table-column label="变动类型" align="center" prop="changeType" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.changeType === '0' ? 'success' : scope.row.changeType === '1' ? 'danger' : 'warning'">{{ typeLabel(scope.row.changeType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="变动数量" align="center" prop="changeQty" width="90" />
      <el-table-column label="变动后库存" align="center" prop="afterQty" width="100" />
      <el-table-column label="关联单号" align="center" prop="refNo" width="150" />
      <el-table-column label="时间" align="center" prop="createTime" width="160">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="120" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['beverage:stock:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="700px" append-to-body>
      <el-form :model="form" :rules="rules" ref="stockRef" label-width="100px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="商品名称" prop="productName">
              <el-select
                v-model="form.productId"
                placeholder="请选择商品"
                filterable
                clearable
                style="width: 100%"
                @change="onProductChange"
              >
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
              <el-input v-model="form.refNo" placeholder="选填" />
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
  </div>
</template>

<script setup name="BeverageStock">
import { listStock, getStock, delStock, addStock, updateStock } from "@/api/beverage/stock"
import { listProduct } from "@/api/beverage/product"
import { parseTime } from "@/utils/ruoyi"
import { useDict } from "@/utils/dict"

const { proxy } = getCurrentInstance()
const { beverage_brand } = useDict('beverage_brand')

// 关联下拉：商品（按名称过滤流水）
const productOptions = ref([])
function loadProducts() {
  listProduct({ pageNum: 1, pageSize: 10000 }).then(res => { productOptions.value = res.rows || [] })
}

const stockList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const multiple = ref(true)
const total = ref(0)
const title = ref("")

const typeOptions = ref([
  { label: '入库', value: '0' },
  { label: '出库', value: '1' },
  { label: '盘点', value: '2' }
])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    productName: undefined,
    brand: undefined,
    changeType: undefined
  },
  rules: {
    productName: [{ required: true, message: "商品名称不能为空", trigger: "blur" }],
    changeType: [{ required: true, message: "变动类型不能为空", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

function typeLabel(v) {
  const m = { '0': '入库', '1': '出库', '2': '盘点' }
  return m[v] || v
}

// 选择商品后自动带出名称/规格/单位，避免手工输入与商品档案不一致
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

function getList() {
  loading.value = true
  listStock(queryParams.value).then(res => {
    loading.value = false
    stockList.value = res.rows
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

onMounted(() => {
  getList()
  loadProducts()
})
</script>

<style scoped lang="scss">
.mb8 { margin-bottom: 8px; }
.form-tip {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
</style>
