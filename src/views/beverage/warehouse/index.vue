<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- 左侧：仓库列表 -->
      <el-col :span="16">
        <div class="mb8" v-if="!embedded">
          <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['beverage:warehouse:add']">新增</el-button>
          <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['beverage:warehouse:edit']">修改</el-button>
          <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['beverage:warehouse:remove']">删除</el-button>
          <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['beverage:warehouse:list']">导出</el-button>
          <span class="tip-text">有库存的仓库不可删除，请先调出或盘点清零；默认仓不可删除</span>
        </div>

        <el-table v-loading="loading" :data="warehouseList" @selection-change="handleSelectionChange" @row-click="handleRowClick" highlight-current-row border stripe>
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column label="仓库编码" align="center" prop="warehouseCode" width="110" />
          <el-table-column label="仓库名称" align="center" prop="warehouseName" min-width="140" show-overflow-tooltip>
            <template #default="scope">
              <span>{{ scope.row.warehouseName }}</span>
              <el-tag v-if="scope.row.isDefault === '1'" type="danger" size="small" style="margin-left:6px">默认</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="联系人" align="center" prop="contact" width="90" />
          <el-table-column label="联系电话" align="center" prop="phone" width="120" />
          <el-table-column label="商品种类" align="center" prop="productCount" width="90" />
          <el-table-column label="库存总量" align="center" prop="stockQty" width="100">
            <template #default="scope">
              <span :style="scope.row.stockQty > 0 ? 'font-weight:600' : 'color:#999'">{{ scope.row.stockQty }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" align="center" prop="status" width="80">
            <template #default="scope">
              <el-tag :type="scope.row.status === '0' ? 'success' : 'info'">{{ scope.row.status === '0' ? '正常' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="排序" align="center" prop="sortNum" width="60" />
          <el-table-column v-if="!embedded" label="操作" align="center" width="150" class-name="small-padding fixed-width">
            <template #default="scope">
              <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['beverage:warehouse:edit']">修改</el-button>
              <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['beverage:warehouse:remove']">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
      </el-col>

      <!-- 右侧：选中仓库的库存分布 -->
      <el-col :span="8">
        <el-card shadow="never" class="dist-card">
          <template #header>
            <span>库存分布：{{ currentWarehouse ? currentWarehouse.warehouseName : '请选择仓库' }}</span>
          </template>
          <div v-if="!currentWarehouse" class="empty-tip">点击左侧行查看该仓库存分布</div>
          <div v-else>
            <el-table :data="distList" size="small" max-height="560" border>
              <el-table-column label="商品" prop="productName" min-width="120" show-overflow-tooltip />
              <el-table-column label="规格" prop="spec" width="80" align="center" />
              <el-table-column label="库存" prop="qty" width="70" align="right">
                <template #default="scope">
                  <span :style="scope.row.qty > 0 ? 'font-weight:600;color:#13ce66' : 'color:#999'">{{ scope.row.qty }}</span>
                </template>
              </el-table-column>
            </el-table>
            <div class="dist-sum">合计 {{ distTotalQty }} 件 / {{ distList.length }} 种</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加或修改仓库对话框 -->
    <el-dialog :title="title" v-model="open" width="620px" append-to-body>
      <el-form ref="warehouseRef" :model="form" :rules="rules" label-width="90px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="仓库编码" prop="warehouseCode">
              <el-input v-model="form.warehouseCode" placeholder="如 WH01" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="仓库名称" prop="warehouseName">
              <el-input v-model="form.warehouseName" placeholder="如 主仓库" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="联系人" prop="contact">
              <el-input v-model="form.contact" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="仓库地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入仓库地址" />
        </el-form-item>
        <el-row>
          <el-col :span="8">
            <el-form-item label="默认仓" prop="isDefault">
              <el-switch v-model="form.isDefault" active-value="1" inactive-value="0" active-text="是" inactive-text="否" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio value="0">正常</el-radio>
                <el-radio value="1">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序" prop="sortNum">
              <el-input-number v-model="form.sortNum" :min="0" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
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

<script setup name="BeverageWarehouse">
import { ref } from 'vue'
import { listWarehouse, getWarehouse, delWarehouse, addWarehouse, updateWarehouse } from "@/api/beverage/warehouse"
import { listInventory } from "@/api/beverage/inventory"

const { proxy } = getCurrentInstance()

// embedded=true 时作为内嵌组件使用（隐藏工具栏与操作列）
const props = defineProps({
  embedded: { type: Boolean, default: false }
})

const warehouseList = ref([])
const distList = ref([])
const currentWarehouse = ref(null)
const open = ref(false)
const loading = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    warehouseName: undefined,
    status: undefined
  },
  rules: {
    warehouseCode: [{ required: true, message: "仓库编码不能为空", trigger: "blur" }],
    warehouseName: [{ required: true, message: "仓库名称不能为空", trigger: "blur" }]
  }
})
const { queryParams, form, rules } = toRefs(data)

const distTotalQty = computed(() => distList.value.reduce((s, r) => s + (Number(r.qty) || 0), 0))

/** 查询仓库列表 */
function getList() {
  loading.value = true
  listWarehouse(queryParams.value).then(res => {
    warehouseList.value = res.rows
    total.value = res.total
    loading.value = false
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    warehouseId: undefined,
    warehouseCode: undefined,
    warehouseName: undefined,
    contact: undefined,
    phone: undefined,
    address: undefined,
    isDefault: "0",
    status: "0",
    sortNum: 0,
    remark: undefined
  }
  proxy.resetForm("warehouseRef")
}

/** 新增按钮 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加仓库"
}

/** 修改按钮 */
function handleUpdate(row) {
  reset()
  const warehouseId = row.warehouseId || ids.value[0]
  getWarehouse(warehouseId).then(res => {
    form.value = res.data
    open.value = true
    title.value = "修改仓库"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["warehouseRef"].validate(valid => {
    if (valid) {
      if (form.value.warehouseId != undefined) {
        updateWarehouse(form.value).then(res => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addWarehouse(form.value).then(res => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除按钮 */
function handleDelete(row) {
  const warehouseIds = row.warehouseId || ids.value
  proxy.$modal.confirm('是否确认删除选中的仓库？').then(function () {
    return delWarehouse(warehouseIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮 */
function handleExport() {
  proxy.download("beverage/warehouse/export", { ...queryParams.value }, `warehouse_${new Date().getTime()}.xlsx`)
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.warehouseId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 点击行：加载该仓库存分布 */
function handleRowClick(row) {
  currentWarehouse.value = row
  loadDist(row.warehouseId)
}

function loadDist(warehouseId) {
  listInventory({ warehouseId }).then(res => {
    distList.value = res.rows || res.data || []
  })
}

onMounted(() => {
  getList()
})

defineExpose({ getList })
</script>

<style scoped>
.mb8 { margin-bottom: 8px; }
.tip-text { margin-left: 12px; font-size: 12px; color: #909399; }
.dist-card { min-height: 500px; }
.empty-tip { padding: 40px 0; text-align: center; color: #909399; font-size: 13px; }
.dist-sum { margin-top: 8px; text-align: right; font-size: 12px; color: #606266; }
</style>
