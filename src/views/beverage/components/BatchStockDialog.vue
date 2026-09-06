<template>
  <el-dialog title="调整库存（按批次）" v-model="visible" width="860px" append-to-body @closed="onClosed">
    <div v-if="target" class="stock-adjust">
      <div class="stock-adjust__head">
        <b>{{ target.productName }}</b>
        <span class="stock-adjust__meta">{{ target.spec }} / {{ target.unit }}</span>
        <el-tag size="small" effect="plain" style="margin-left:auto">当前总库存 {{ target.stock }} {{ target.unit }}</el-tag>
      </div>
      <el-alert type="info" :closable="false" style="margin:10px 0"
        title="调整库存必须按批次操作：批次号与保质期至为必填项；商品总库存将按各批次增减量自动联动（保存后总库存 = 当前 + 各批次变动合计）。" />
      <el-table :data="batches" size="small" border v-loading="loading">
        <el-table-column label="批次号" min-width="130">
          <template #default="s">
            <el-input v-model="s.row.batchNo" :disabled="!!s.row.batchId" placeholder="批次号(必填)" maxlength="50" />
          </template>
        </el-table-column>
        <el-table-column label="生产日期" width="145">
          <template #default="s">
            <el-date-picker v-model="s.row.productionDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" placeholder="生产日期" style="width:100%" />
          </template>
        </el-table-column>
        <el-table-column label="保质期至" width="145">
          <template #default="s">
            <el-date-picker v-model="s.row.expiryDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" placeholder="保质期至(必填)" style="width:100%" />
          </template>
        </el-table-column>
        <el-table-column label="当前数量" width="85" align="center">
          <template #default="s"><span>{{ s.row.origQty }}</span></template>
        </el-table-column>
        <el-table-column label="调整为" width="120">
          <template #default="s">
            <el-input-number v-model="s.row.qty" :min="0" :step="1" :precision="0" :controls-position="'right'" style="width:100%" />
          </template>
        </el-table-column>
        <el-table-column label="变动" width="80" align="center">
          <template #default="s">
            <span :style="{ color: delta(s.row) > 0 ? '#67C23A' : (delta(s.row) < 0 ? '#F56C6C' : '#909399'), fontWeight: 600 }">
              {{ delta(s.row) > 0 ? '+' : '' }}{{ delta(s.row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" align="center">
          <template #default="s">
            <el-button v-if="!s.row.batchId" link type="danger" icon="Delete" @click="batches.splice(s.$index, 1)" />
            <el-tooltip v-else content="已有批次请将数量调整为 0 清空，不直接删除" placement="top">
              <el-button link type="info" icon="Lock" disabled />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      <div style="display:flex;align-items:center;margin-top:10px;gap:12px">
        <el-button type="primary" plain icon="Plus" size="small" @click="addBatch">新增批次</el-button>
        <span style="margin-left:auto;font-size:13px">
          批次合计 <b style="font-size:16px">{{ batchTotal }}</b> {{ target.unit }}，
          保存后总库存 <b :style="{ color: totalDelta > 0 ? '#67C23A' : (totalDelta < 0 ? '#F56C6C' : 'inherit') }">{{ Number(target.stock) + totalDelta }}</b>
          <span style="color:var(--el-text-color-secondary)">（{{ totalDelta > 0 ? '+' : '' }}{{ totalDelta }}）</span>
        </span>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="submit">确 定</el-button>
        <el-button @click="visible = false">取 消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup name="BatchStockDialog">
import { getProduct, updateProductStock } from "@/api/beverage/product"
import { listBatch } from "@/api/beverage/batch"

const { proxy } = getCurrentInstance()
const emit = defineEmits(['saved'])

const visible = ref(false)
const loading = ref(false)
const target = ref(null)
const batches = ref([])

const batchTotal = computed(() => batches.value.reduce((s, b) => s + (Number(b.qty) || 0), 0))
function delta(b) {
  return (Number(b.qty) || 0) - (Number(b.origQty) || 0)
}
const totalDelta = computed(() => batches.value.reduce((s, b) => s + delta(b), 0))

/** 打开：加载商品信息与现有批次 */
function open(productId) {
  loading.value = true
  visible.value = true
  Promise.all([
    getProduct(productId),
    listBatch({ productId })
  ]).then(([pRes, bRes]) => {
    const p = pRes.data
    target.value = { ...p }
    const list = (bRes.data || bRes.rows || []).map(b => ({
      batchId: b.batchId,
      batchNo: b.batchNo,
      productionDate: b.productionDate ? String(b.productionDate).slice(0, 10) : undefined,
      expiryDate: b.expiryDate ? String(b.expiryDate).slice(0, 10) : undefined,
      qty: Number(b.qty) || 0,
      origQty: Number(b.qty) || 0
    }))
    // 未按批次建档的历史存量：总量 > 批次合计时补一行空白批次供建档
    const batchSum = list.reduce((s, b) => s + b.origQty, 0)
    const legacy = (Number(p.stock) || 0) - batchSum
    if (legacy > 0) {
      list.push({ batchId: undefined, batchNo: '', productionDate: undefined, expiryDate: undefined, qty: 0, origQty: 0 })
    }
    batches.value = list
  }).finally(() => { loading.value = false })
}

function addBatch() {
  batches.value.push({ batchId: undefined, batchNo: '', productionDate: undefined, expiryDate: undefined, qty: 0, origQty: 0 })
}

function submit() {
  if (!target.value) return
  const rows = batches.value
  const changed = rows.filter(b => delta(b) !== 0)
  // 校验发生变动的批次行：批次号/保质期至必填
  for (let i = 0; i < changed.length; i++) {
    const b = changed[i]
    if (!b.batchNo || !b.batchNo.trim()) {
      proxy.$modal.msgError('批次号不能为空：请为变动批次填写批次号')
      return
    }
    if (!b.expiryDate) {
      proxy.$modal.msgError('保质期至不能为空（批次 ' + (b.batchNo || '') + '）')
      return
    }
    if (b.productionDate && b.expiryDate && b.productionDate > b.expiryDate) {
      proxy.$modal.msgError('批次 ' + b.batchNo + ' 生产日期不能晚于保质期至')
      return
    }
  }
  // 与未变动批次之间批次号重复校验
  const changedNos = changed.map(b => (b.batchNo || '').trim())
  const otherNos = rows.filter(b => delta(b) === 0).map(b => (b.batchNo || '').trim()).filter(Boolean)
  if (changedNos.some(n => otherNos.includes(n))) {
    proxy.$modal.msgError('批次号与已有批次重复，请检查')
    return
  }
  if (new Set(changedNos).size !== changedNos.length) {
    proxy.$modal.msgError('存在重复的批次号，请检查')
    return
  }
  // 只提交发生数量变动的批次（后端按批次差额联动总量并写台账）
  const payload = changed.map(b => ({
    productId: target.value.productId,
    batchId: b.batchId,
    batchNo: b.batchNo.trim(),
    productionDate: b.productionDate || undefined,
    expiryDate: b.expiryDate,
    qty: Number(b.qty) || 0
  }))
  if (payload.length === 0) {
    proxy.$modal.msgWarning("批次数量没有变化")
    return
  }
  updateProductStock(payload).then(() => {
    proxy.$modal.msgSuccess("已按批次调整库存并生成台账记录")
    visible.value = false
    emit('saved')
  }).catch(() => {})
}

function onClosed() {
  target.value = null
  batches.value = []
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.stock-adjust {
  &__head { display: flex; align-items: baseline; gap: 8px; font-size: 14px; }
  &__meta { font-size: 12px; color: var(--el-text-color-secondary); }
}
</style>
