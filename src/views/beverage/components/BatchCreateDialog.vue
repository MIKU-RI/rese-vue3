<template>
  <el-dialog v-model="visible" title="新增批次入库" width="720px" append-to-body @open="onOpen">
    <el-alert type="info" :closable="false" style="margin-bottom: 14px"
              title="同一批次号/保质期下批量录入多个商品的入库数量；同商品同批次号已存在时数量累加。入库后商品总量与库存台账自动联动。" />

    <el-form label-width="90px">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="批次号" required>
            <div style="display:flex;gap:8px;width:100%">
              <el-input v-model="form.batchNo" placeholder="如 PC20260908-01" maxlength="50" />
              <el-button @click="genBatchNo">自动生成</el-button>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="生产日期" label-width="80px">
            <el-date-picker v-model="form.productionDate" type="date" value-format="YYYY-MM-DD"
                            placeholder="选填" style="width:100%" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="保质期至" label-width="80px" required>
            <el-date-picker v-model="form.expiryDate" type="date" value-format="YYYY-MM-DD"
                            placeholder="必填" style="width:100%" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <el-table :data="rows" size="small" border empty-text="点击下方按钮添加商品">
      <el-table-column label="商品" min-width="240">
        <template #default="scope">
          <el-select v-model="scope.row.productId" filterable placeholder="搜索并选择商品"
                     style="width:100%" @change="onProductChange(scope.$index)">
            <el-option v-for="p in availableProducts(scope.row.productId)" :key="p.productId"
                       :label="p.productName + (p.spec ? '（' + p.spec + '）' : '')" :value="p.productId" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="入库数量" width="140" align="center">
        <template #default="scope">
          <el-input-number v-model="scope.row.qty" :min="1" :max="999999" :step="1"
                           :precision="0" controls-position="right" style="width:120px" />
        </template>
      </el-table-column>
      <el-table-column label="规格/单位" width="130" align="center">
        <template #default="scope">{{ specText(scope.row.productId) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="70" align="center">
        <template #default="scope">
          <el-button link type="danger" @click="rows.splice(scope.$index, 1)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-button icon="Plus" size="small" style="margin-top:8px" @click="addRow">添加商品</el-button>

    <el-form label-width="90px" style="margin-top:10px">
      <el-form-item label="备注">
        <el-input v-model="form.remark" placeholder="选填，如：供应商送货批次" maxlength="100" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确认入库</el-button>
    </template>
  </el-dialog>
</template>

<script setup name="BatchCreateDialog">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { listProduct } from '@/api/beverage/product'
import { createBatchInbound } from '@/api/beverage/batch'

const emit = defineEmits(['success'])

const visible = ref(false)
const submitting = ref(false)
const products = ref([])
const rows = ref([{ productId: null, qty: 1 }])
const form = reactive({ batchNo: '', productionDate: null, expiryDate: null, remark: '' })

// 已在明细中选过的商品不可重复选择
const availableProducts = (currentId) => {
  const used = new Set(rows.value.filter(r => r.productId && r.productId !== currentId).map(r => r.productId))
  return products.value.filter(p => !used.has(p.productId))
}
const productById = (id) => products.value.find(p => p.productId === id)
const specText = (id) => {
  const p = productById(id)
  return p ? [p.spec, p.unit].filter(Boolean).join(' / ') || '-' : '-'
}

function genBatchNo() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 900) + 100)
  form.batchNo = 'PC' + y + m + day + '-' + rand
}

function addRow() {
  rows.value.push({ productId: null, qty: 1 })
}

function onProductChange() {}

function onOpen() {
  form.batchNo = ''
  form.productionDate = null
  form.expiryDate = null
  form.remark = ''
  rows.value = [{ productId: null, qty: 1 }]
  genBatchNo()
  listProduct({ pageNum: 1, pageSize: 999 }).then(res => {
    products.value = res.rows || []
  }).catch(() => { products.value = [] })
}

function submit() {
  if (!form.batchNo.trim()) return ElMessage.warning('请填写批次号')
  if (!form.expiryDate) return ElMessage.warning('请选择保质期至')
  const items = rows.value.filter(r => r.productId)
  if (!items.length) return ElMessage.warning('请至少为一个商品录入入库数量')
  if (items.some(r => !r.qty || r.qty <= 0)) return ElMessage.warning('入库数量必须大于 0')
  submitting.value = true
  createBatchInbound({
    batchNo: form.batchNo.trim(),
    productionDate: form.productionDate || null,
    expiryDate: form.expiryDate,
    remark: form.remark || null,
    items: items.map(r => ({ productId: r.productId, qty: r.qty }))
  }).then(res => {
    ElMessage.success('批次入库成功：' + items.length + ' 个商品已录入批次「' + form.batchNo.trim() + '」')
    visible.value = false
    emit('success')
  }).finally(() => {
    submitting.value = false
  })
}

defineExpose({ open: () => { visible.value = true } })
</script>
