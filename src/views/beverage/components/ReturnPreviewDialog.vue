<template>
  <el-dialog :title="dialogTitle" v-model="visible" width="1080px" append-to-body :close-on-click-modal="false" @open="onOpen">
    <el-form :model="form" ref="previewRef" label-width="96px">
      <el-row>
        <el-col :span="8">
          <el-form-item label="退货日期" prop="returnDate">
            <el-date-picker v-model="form.returnDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD"
              placeholder="选择日期" style="width:100%" />
          </el-form-item>
        </el-col>
        <el-col :span="16">
          <el-form-item label="执行方式">
            <el-radio-group v-model="form.status">
              <el-radio value="1">立即退货（确认后马上联动库存）</el-radio>
              <el-radio value="0">仅登记为待退货（稍后在退货单列表执行）</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="24">
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="1" placeholder="（可选）退货原因等说明" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <el-alert type="info" :closable="false" style="margin-bottom:10px"
      :title="'来源单 ' + (sourceNo || '-') + ' · ' + partnerLabel + '：勾选要退的商品并调整数量（不超过剩余可退），确认后生成退货单。'" />

    <el-table v-loading="loading" :data="rows" border>
      <el-table-column label="退" width="46" align="center">
        <template #default="scope">
          <el-checkbox v-model="scope.row.checked" :disabled="!(scope.row.remainingQty > 0)" />
        </template>
      </el-table-column>
      <el-table-column label="商品" min-width="160">
        <template #default="scope">
          <span>{{ scope.row.productName || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="规格" prop="spec" width="90" />
      <el-table-column label="单位" prop="unit" width="60" />
      <el-table-column label="原单数量" prop="origQty" width="90" align="center" />
      <el-table-column label="已退" width="80" align="center">
        <template #default="scope">{{ (scope.row.origQty || 0) - (scope.row.remainingQty || 0) }}</template>
      </el-table-column>
      <el-table-column label="剩余可退" prop="remainingQty" width="90" align="center" />
      <el-table-column label="本次退货数量" width="150">
        <template #default="scope">
          <el-input-number v-model="scope.row.qty" :min="1" :max="scope.row.remainingQty || 1" :precision="0"
            :controls-position="'right'" style="width:100%" :disabled="!scope.row.checked" @change="recalc" />
          <div v-if="scope.row.checked && scope.row.qty > scope.row.remainingQty" style="color:#f56c6c;font-size:12px;line-height:1.3;">
            超出剩余可退数量
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="isPurchaseReturn ? '进货价' : '售价'" width="100" align="center">
        <template #default="scope">¥ {{ formatMoney(scope.row.price) }}</template>
      </el-table-column>
      <el-table-column v-if="!isPurchaseReturn" label="折扣%" width="110">
        <template #default="scope">
          <el-input-number v-model="scope.row.discount" :min="1" :max="100" :precision="0" :step="5"
            :controls-position="'right'" style="width:100%" :disabled="!scope.row.checked" @change="recalc" />
        </template>
      </el-table-column>
      <el-table-column :label="isPurchaseReturn ? '金额' : '退款金额'" width="110" align="center">
        <template #default="scope"><span>¥ {{ formatMoney(itemAmount(scope.row)) }}</span></template>
      </el-table-column>
      <el-table-column label="备注" min-width="130">
        <template #default="scope">
          <el-input v-model="scope.row.remark" placeholder="（可选）" size="small" :disabled="!scope.row.checked" />
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top:12px;text-align:right;">
      <span style="margin-right:16px;color:#606266;">勾选 {{ checkedCount }} 项，合计：</span>
      <span style="color:#f56c6c;font-weight:bold;font-size:16px;">¥ {{ formatMoney(computedTotal) }}</span>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="submitPreview" :disabled="submitting">确认生成退货单</el-button>
        <el-button @click="visible = false">取 消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup name="ReturnPreviewDialog">
import { ref, computed, watch } from 'vue'
import { addReturn, getRemainingQty } from "@/api/beverage/return"
import { getPurchase } from "@/api/beverage/purchase"
import { getSale } from "@/api/beverage/sale"

const { proxy } = getCurrentInstance()

const props = defineProps({
  // 对话框显隐（v-model）
  modelValue: { type: Boolean, default: false },
  // 来源单据：1=采购单(生成采购退货) 2=销售单(生成销售退货)
  sourceType: { type: String, default: '1' },
  sourceId: { type: [Number, String], default: undefined },
  sourceNo: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const isPurchaseReturn = computed(() => props.sourceType !== '2')
const dialogTitle = computed(() => (isPurchaseReturn.value ? '采购退货预览确认' : '销售退货预览确认'))
const partnerLabel = ref('-')

const loading = ref(false)
const submitting = ref(false)
const rows = ref([])
const form = ref({ returnDate: today(), status: '1', remark: undefined })
// 往来单位（来源单带出，提交时写入退货单）
const partner = ref({ supplierId: undefined, supplierName: undefined, customerId: undefined, customerName: undefined })

function today() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatMoney(val) {
  if (val == null) return '0.00'
  return Number(val).toFixed(2)
}

function itemAmount(row) {
  const qty = Number(row.qty) || 0
  const price = Number(row.price) || 0
  if (!isPurchaseReturn.value) {
    const d = Number(row.discount) || 100
    return (qty * price * d / 100).toFixed(2)
  }
  return (qty * price).toFixed(2)
}

const checkedRows = computed(() => rows.value.filter(r => r.checked))
const checkedCount = computed(() => checkedRows.value.length)
const computedTotal = computed(() => {
  let t = 0
  checkedRows.value.forEach(r => { t += Number(itemAmount(r)) })
  return t.toFixed(2)
})

function recalc() { /* 触发 computedTotal 刷新 */ }

/** 打开时加载来源单与剩余可退明细，默认全选、数量预填为剩余可退 */
function onOpen() {
  rows.value = []
  form.value = { returnDate: today(), status: '1', remark: undefined }
  partner.value = { supplierId: undefined, supplierName: undefined, customerId: undefined, customerName: undefined }
  if (!props.sourceId) return
  loading.value = true
  const fetch = isPurchaseReturn.value ? getPurchase : getSale
  fetch(props.sourceId).then(res => {
    const d = res.data || {}
    if (isPurchaseReturn.value) {
      partner.value.supplierId = d.supplierId
      partner.value.supplierName = d.supplierName
      partnerLabel.value = '供应商 ' + (d.supplierName || '-')
    } else {
      partner.value.customerId = d.customerId
      partner.value.customerName = d.customerName
      partnerLabel.value = '客户 ' + (d.customerName || '-')
    }
    return getRemainingQty(props.sourceType, props.sourceId)
  }).then(res2 => {
    const list = (res2.data || []).filter(r => (r.remainingQty || 0) > 0)
    rows.value = list.map(r => ({
      productId: r.productId,
      productName: r.productName,
      spec: r.spec,
      unit: r.unit,
      origQty: r.origQty,
      remainingQty: r.remainingQty,
      qty: r.remainingQty,
      price: r.price,
      discount: r.discount != null ? Number(r.discount) : 100,
      remark: undefined,
      checked: true
    }))
    loading.value = false
  }).catch(() => { loading.value = false })
}

watch(() => props.modelValue, (v) => { if (v) onOpen() })

function submitPreview() {
  const selected = checkedRows.value
  if (selected.length === 0) {
    proxy.$modal.msgWarning('请至少勾选一件要退的商品')
    return
  }
  for (let i = 0; i < selected.length; i++) {
    const r = selected[i]
    const qty = Number(r.qty) || 0
    if (qty <= 0) {
      proxy.$modal.msgWarning('「' + r.productName + '」退货数量必须大于 0')
      return
    }
    if (qty > Number(r.remainingQty || 0)) {
      proxy.$modal.msgWarning('「' + r.productName + '」退货数量 ' + qty + ' 超出剩余可退数量 ' + r.remainingQty)
      return
    }
  }
  if (!form.value.returnDate) {
    proxy.$modal.msgWarning('请选择退货日期')
    return
  }
  const payload = {
    returnType: isPurchaseReturn.value ? '1' : '2',
    returnDate: form.value.returnDate,
    status: form.value.status,
    sourceId: props.sourceId,
    sourceNo: props.sourceNo || undefined,
    remark: form.value.remark,
    totalAmount: computedTotal.value,
    items: selected.map(r => ({
      productId: r.productId,
      productName: r.productName,
      spec: r.spec,
      unit: r.unit,
      qty: Number(r.qty),
      price: r.price,
      discount: isPurchaseReturn.value ? 100 : (Number(r.discount) || 100),
      remark: r.remark
    }))
  }
  if (isPurchaseReturn.value) {
    payload.supplierId = partner.value.supplierId
    payload.supplierName = partner.value.supplierName
  } else {
    payload.customerId = partner.value.customerId
    payload.customerName = partner.value.customerName
  }
  const tip = form.value.status === '1'
    ? '确认生成退货单并立即执行？将按预览数量联动库存。'
    : '确认生成退货单（待退货）？可在退货单列表再执行。'
  proxy.$modal.confirm(tip).then(() => {
    submitting.value = true
    return addReturn(payload)
  }).then(() => {
    proxy.$modal.msgSuccess('退货单已生成')
    visible.value = false
    emit('success')
  }).catch(() => {}).finally(() => { submitting.value = false })
}
</script>

<style scoped lang="scss">
:deep(.el-alert__title) { font-size: 13px; }
</style>
