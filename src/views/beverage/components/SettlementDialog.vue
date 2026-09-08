<template>
  <el-dialog :title="title" v-model="visible" width="600px" append-to-body @close="onClose">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="业务类型" prop="bizType">
        <el-radio-group v-model="form.bizType" :disabled="!!props.presetRelatedId">
          <el-radio value="1">收款</el-radio>
          <el-radio value="2">付款</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="form.bizType === '1' ? '客户' : '供应商'" prop="counterpartyId">
        <el-select v-model="form.counterpartyId" :disabled="!!props.presetCounterpartyId" filterable
          placeholder="请选择" style="width: 100%" @change="onCounterpartyChange">
          <el-option v-for="c in counterpartyOptions" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="关联单据" prop="relatedId">
        <el-select v-model="form.relatedId" filterable placeholder="请选择未结单据" style="width: 100%" @change="onDocChange">
          <el-option v-for="d in docOptions" :key="d.id" :label="d.label" :value="d.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="未结余额">
        <span style="color: #f56c6c; font-weight: 700">¥ {{ unpaidText }}</span>
        <el-tag v-if="currentDoc && (Number(currentDoc.returnAmount) || 0) > 0" type="warning" size="small" style="margin-left:8px">
          已退 ¥{{ (Number(currentDoc.returnAmount) || 0).toFixed(2) }}
        </el-tag>
      </el-form-item>
      <el-form-item label="金额" prop="amount">
        <el-input-number v-model="form.amount" :min="0" :max="maxAmount" :precision="2" :step="10"
          style="width: 100%" controls-position="right" />
      </el-form-item>
      <el-form-item label="日期" prop="settleDate">
        <el-date-picker v-model="form.settleDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>
      <el-form-item label="方式" prop="payMethod">
        <el-radio-group v-model="form.payMethod">
          <el-radio value="1">现金</el-radio>
          <el-radio value="2">银行</el-radio>
          <el-radio value="3">微信</el-radio>
          <el-radio value="4">支付宝</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="可选" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取 消</el-button>
      <el-button type="primary" @click="submit">确 定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, getCurrentInstance } from 'vue'
import { listCustomer } from '@/api/beverage/customer'
import { listSupplier } from '@/api/beverage/supplier'
import { listSale } from '@/api/beverage/sale'
import { listPurchase } from '@/api/beverage/purchase'
import { addSettlement } from '@/api/beverage/settlement'

const { proxy } = getCurrentInstance()

const props = defineProps({
  modelValue: Boolean,
  bizType: { type: String, default: '1' },
  presetRelatedId: { type: [Number, String], default: null },
  presetCounterpartyId: { type: [Number, String], default: null }
})
const emit = defineEmits(['update:modelValue', 'success'])

const title = computed(() => props.bizType === '1' ? '收款登记' : '付款登记')
const visible = ref(false)
const formRef = ref()
const form = reactive({
  bizType: '1', counterpartyId: null, relatedId: null,
  amount: 0, settleDate: new Date().toISOString().slice(0, 10),
  payMethod: '1', remark: ''
})
const counterpartyOptions = ref([])
const docOptions = ref([])
const currentDoc = ref(null)

// 净应收/净应付 = 原单金额 − 已退货金额(已生效) − 已收/已付
function docNet(row) {
  const total = Number(row.totalAmount) || 0
  const ret = Number(row.returnAmount) || 0
  const paid = Number(row.paidAmount) || 0
  return Math.max(0, total - ret - paid)
}
const unpaid = computed(() => currentDoc.value ? docNet(currentDoc.value) : 0)
const unpaidText = computed(() => unpaid.value.toFixed(2))
const maxAmount = computed(() => unpaid.value)

const rules = {
  counterpartyId: [{ required: true, message: '请选择往来单位', trigger: 'change' }],
  relatedId: [{ required: true, message: '请选择关联单据', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

watch(() => props.modelValue, (v) => {
  visible.value = v
  if (v) resetAndLoad()
})
watch(visible, (v) => emit('update:modelValue', v))

function resetAndLoad() {
  form.bizType = props.bizType || '1'
  form.counterpartyId = props.presetCounterpartyId ? Number(props.presetCounterpartyId) : null
  form.relatedId = props.presetRelatedId ? Number(props.presetRelatedId) : null
  form.amount = 0
  form.settleDate = new Date().toISOString().slice(0, 10)
  form.payMethod = '1'
  form.remark = ''
  currentDoc.value = null
  docOptions.value = []
  loadCounterparties()
  if (form.counterpartyId) onCounterpartyChange(form.counterpartyId)
  if (form.relatedId) onDocChange(form.relatedId)
}

function loadCounterparties() {
  if (form.bizType === '1') {
    listCustomer({ pageNum: 1, pageSize: 9999 }).then(res => {
      counterpartyOptions.value = (res.rows || []).map(c => ({ id: c.customerId, name: c.customerName }))
    })
  } else {
    listSupplier({ pageNum: 1, pageSize: 9999 }).then(res => {
      counterpartyOptions.value = (res.rows || []).map(s => ({ id: s.supplierId, name: s.supplierName }))
    })
  }
}

function onCounterpartyChange(id) {
  form.relatedId = null
  currentDoc.value = null
  if (!id) { docOptions.value = []; return }
  const loader = form.bizType === '1' ? listSale : listPurchase
  const key = form.bizType === '1' ? 'customerId' : 'supplierId'
  const q = { pageNum: 1, pageSize: 9999, status: '1' }
  q[key] = id
  loader(q).then(res => { docOptions.value = buildDocs(res.rows || []) })
}

function buildDocs(rows) {
  const word = form.bizType === '1' ? '应收' : '应付'
  return rows.map(d => {
    const total = Number(d.totalAmount) || 0
    const ret = Number(d.returnAmount) || 0
    const paid = Number(d.paidAmount) || 0
    const net = Math.max(0, total - ret)
    const un = Math.max(0, net - paid)
    return {
      id: d.saleId || d.purchaseId, doc: d, totalAmount: total, returnAmount: ret,
      paidAmount: paid, netAmount: net, un,
      label: (d.saleNo || d.purchaseNo) + '  净' + word + '¥' + un.toFixed(2)
    }
  }).filter(x => x.un > 0)
}

function onDocChange(id) {
  const opt = docOptions.value.find(d => d.id === id)
  currentDoc.value = opt ? opt.doc : null
  if (opt) form.amount = opt.un
}

function submit() {
  formRef.value.validate(valid => {
    if (!valid) return
    if (!currentDoc.value) { proxy.$modal.msgError('请选择关联单据'); return }
    if (form.amount <= 0) { proxy.$modal.msgError('金额必须大于 0'); return }
    if (form.amount > unpaid.value + 1e-9) {
      proxy.$modal.msgError('金额不能超过未结余额 ¥' + unpaid.value.toFixed(2)); return
    }
    const data = {
      bizType: form.bizType,
      relatedId: form.relatedId,
      amount: form.amount,
      settleDate: form.settleDate,
      payMethod: form.payMethod,
      remark: form.remark
    }
    addSettlement(data).then(() => {
      proxy.$modal.msgSuccess('登记成功')
      visible.value = false
      emit('success')
    })
  })
}

function onClose() { formRef.value && formRef.value.resetFields() }
</script>
