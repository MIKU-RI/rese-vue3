<template>
  <el-dialog
    v-model="visible"
    :title="docTitle"
    width="860px"
    append-to-body
    class="doc-print-dialog"
    @open="nextTick(() => docReady = true)"
  >
    <div ref="printAreaRef" class="doc-print-area" v-if="docReady">
      <!-- 单据抬头 -->
      <div class="doc-head">
        <div class="doc-title">{{ docTitle }}</div>
        <div class="doc-subtitle">{{ subtitleEn }}</div>
      </div>

      <!-- 单据信息 -->
      <div class="doc-meta">
        <div class="meta-row">
          <div class="meta-item"><span class="meta-label">{{ noLabel }}：</span><span class="meta-value">{{ doc[noField] || '-' }}</span></div>
          <div class="meta-item"><span class="meta-label">{{ dateLabel }}：</span><span class="meta-value">{{ (doc[dateField] || '').toString().substring(0, 10) || '-' }}</span></div>
          <div class="meta-item"><span class="meta-label">状态：</span><span class="meta-value">{{ doc.status === '1' ? '已' + statusWord : '待' + statusWord }}</span></div>
        </div>
        <div class="meta-row">
          <div class="meta-item" v-if="docType !== 'return'">
            <span class="meta-label">{{ docType === 'sale' ? '客户' : '供应商' }}：</span>
            <span class="meta-value">{{ docType === 'sale' ? doc.customerName : doc.supplierName || '-' }}</span>
          </div>
          <div class="meta-item" v-else>
            <span class="meta-label">{{ doc.returnType === '1' ? '供应商' : '客户' }}：</span>
            <span class="meta-value">{{ doc.returnType === '1' ? doc.supplierName : doc.customerName || '-' }}</span>
          </div>
          <div class="meta-item" v-if="docType === 'return'">
            <span class="meta-label">来源单号：</span><span class="meta-value">{{ doc.sourceNo || '-' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">{{ moneyLabel }}：</span>
            <span class="meta-value">￥{{ formatAmount(doc.totalAmount) }}</span>
          </div>
          <div class="meta-item" v-if="docType === 'sale'">
            <span class="meta-label">已收：</span><span class="meta-value">￥{{ formatAmount(doc.paidAmount) }}</span>
          </div>
          <div class="meta-item" v-if="docType === 'purchase'">
            <span class="meta-label">已付：</span><span class="meta-value">￥{{ formatAmount(doc.paidAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- 明细表 -->
      <table class="doc-table">
        <thead>
          <tr>
            <th style="width: 34px">序号</th>
            <th>商品名称</th>
            <th style="width: 90px">规格</th>
            <th style="width: 44px">单位</th>
            <th style="width: 90px" v-if="docType === 'purchase'">批次号</th>
            <th style="width: 54px">数量</th>
            <th style="width: 66px">单价</th>
            <th style="width: 54px" v-if="showDiscount">折扣%</th>
            <th style="width: 76px">金额</th>
            <th style="width: 90px">备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in doc.items || []" :key="index">
            <td class="ta-center">{{ index + 1 }}</td>
            <td>{{ item.productName }}</td>
            <td class="ta-center">{{ item.spec || '-' }}</td>
            <td class="ta-center">{{ item.unit || '-' }}</td>
            <td class="ta-center" v-if="docType === 'purchase'">{{ item.batchNo || '-' }}</td>
            <td class="ta-right">{{ item.qty }}</td>
            <td class="ta-right">{{ formatAmount(item.price) }}</td>
            <td class="ta-right" v-if="showDiscount">{{ item.discount != null ? item.discount : 100 }}</td>
            <td class="ta-right">{{ formatAmount(item.amount) }}</td>
            <td class="ta-center">{{ item.remark || '' }}</td>
          </tr>
          <!-- 补空行，保证单据最低高度 -->
          <tr v-for="n in blankRows" :key="'b' + n" class="blank-row">
            <td class="ta-center">&nbsp;</td>
            <td></td>
            <td></td>
            <td></td>
            <td v-if="docType === 'purchase'"></td>
            <td></td>
            <td></td>
            <td v-if="showDiscount"></td>
            <td></td>
            <td></td>
          </tr>
          <tr class="sum-row">
            <td class="ta-center">合计</td>
            <td :colspan="2 + (docType === 'purchase' ? 1 : 0) + (showDiscount ? 1 : 0)">共 {{ (doc.items || []).length }} 项</td>
            <td class="ta-right" v-if="docType === 'purchase'"></td>
            <td class="ta-right" v-if="showDiscount"></td>
            <td class="ta-right">{{ totalQty }}</td>
            <td class="ta-right" colspan="2" v-if="showDiscount">￥{{ formatAmount(doc.totalAmount) }}</td>
            <td class="ta-right" v-else>￥{{ formatAmount(doc.totalAmount) }}</td>
            <td class="ta-center"></td>
          </tr>
        </tbody>
      </table>

      <!-- 大写金额 -->
      <div class="doc-amount-cn">
        <span class="meta-label">金额大写：</span>
        <span class="cn-value">{{ amountCN || '零元整' }}</span>
      </div>

      <!-- 签字栏 -->
      <div class="doc-sign">
        <div class="sign-item"><span class="sign-label">{{ docType === 'sale' ? '制单' : docType === 'purchase' ? '制单' : '制单' }}：</span><span class="sign-line"></span></div>
        <div class="sign-item"><span class="sign-label">{{ docType === 'sale' ? '送货人' : docType === 'purchase' ? '仓管员' : '经办人' }}：</span><span class="sign-line"></span></div>
        <div class="sign-item"><span class="sign-label">{{ docType === 'sale' ? '客户签收' : docType === 'purchase' ? '供应商' : '对方确认' }}：</span><span class="sign-line"></span></div>
      </div>
      <div class="doc-footnote">打印时间：{{ printTime }}</div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" icon="Printer" @click="handlePrint">打 印</el-button>
        <el-button @click="visible = false">关 闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup name="DocPrint">
import { computed, nextTick, ref, watch } from "vue"

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  docType: { type: String, default: "sale" }, // sale | purchase | return
  doc: { type: Object, default: () => ({}) }
})
const emit = defineEmits(["update:modelValue"])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v)
})

const docReady = ref(false)
const printAreaRef = ref(null)
const printTime = ref("")

watch(visible, (v) => {
  if (v) {
    docReady.value = false
    printTime.value = new Date().toLocaleString("zh-CN", { hour12: false })
  }
})

/** 标题与字段映射 */
const docTitle = computed(() => {
  if (props.docType === "purchase") return "采购入库单"
  if (props.docType === "sale") return "销售送货单"
  return props.doc.returnType === "1" ? "采购退货单" : "销售退货单"
})
const subtitleEn = computed(() => {
  if (props.docType === "purchase") return "Purchase Inbound Note"
  if (props.docType === "sale") return "Sales Delivery Note"
  return "Return Note"
})
const noField = computed(() => (props.docType === "purchase" ? "purchaseNo" : props.docType === "sale" ? "saleNo" : "returnNo"))
const noLabel = computed(() => (props.docType === "purchase" ? "入库单号" : props.docType === "sale" ? "送货单号" : "退货单号"))
const dateField = computed(() => (props.docType === "purchase" ? "purchaseDate" : props.docType === "sale" ? "saleDate" : "returnDate"))
const dateLabel = computed(() => (props.docType === "purchase" ? "入库日期" : props.docType === "sale" ? "出库日期" : "退货日期"))
const statusWord = computed(() => (props.docType === "purchase" ? "入库" : props.docType === "sale" ? "出库" : "退货"))
const moneyLabel = computed(() => (props.docType === "sale" ? "应收金额" : props.docType === "purchase" ? "应付金额" : "退货金额"))
const showDiscount = computed(() => props.docType === "sale" || (props.docType === "return" && props.doc.returnType === "2"))

/** 采购退货折扣恒为 100 不展示；销售退货展示 */
const blankRows = computed(() => {
  const n = 6 - (props.doc.items || []).length
  return n > 0 ? n : 0
})
const totalQty = computed(() => (props.doc.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0))

function formatAmount(v) {
  const n = Number(v)
  return isNaN(n) ? "0.00" : n.toFixed(2)
}

/** 人民币大写 */
const amountCN = computed(() => amountToCN(Number(props.doc.totalAmount) || 0))

function amountToCN(num) {
  if (isNaN(num)) return ""
  const negative = num < 0
  num = Math.abs(num)
  const digits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"]
  const intUnits = ["", "拾", "佰", "仟"]
  const bigUnits = ["", "万", "亿", "万亿"]
  const decUnits = ["角", "分"]
  let str = ""
  let intNum = Math.floor(num)
  let decPart = Math.round((num - intNum) * 100)
  if (intNum === 0 && decPart === 0) return "零元整"
  // 整数部分
  let intStr = String(intNum)
  let groups = []
  while (intStr.length > 0) {
    groups.unshift(intStr.slice(-4))
    intStr = intStr.slice(0, -4)
  }
  let cnInt = ""
  for (let g = 0; g < groups.length; g++) {
    let groupStr = ""
    let zeroFlag = false
    for (let i = 0; i < groups[g].length; i++) {
      const d = Number(groups[g][i])
      const unitIdx = groups[g].length - 1 - i
      if (d === 0) {
        zeroFlag = true
      } else {
        if (zeroFlag && groupStr !== "") groupStr += "零"
        groupStr += digits[d] + intUnits[unitIdx]
        zeroFlag = false
      }
    }
    const bigUnit = bigUnits[groups.length - 1 - g]
    if (groupStr !== "") {
      cnInt += groupStr + bigUnit
    } else if (cnInt !== "" && g < groups.length - 1) {
      // 整组为 0（如 100000450 万位组），仅在后续还有值时补零
      cnInt += ""
    }
  }
  if (cnInt !== "") str = cnInt + "元"
  // 小数部分
  const jiao = Math.floor(decPart / 10)
  const fen = decPart % 10
  if (jiao === 0 && fen === 0) {
    if (str !== "") str += "整"
  } else {
    if (jiao > 0) str += digits[jiao] + decUnits[0]
    else if (str !== "" && fen > 0) str += "零"
    if (fen > 0) str += digits[fen] + decUnits[1]
    else if (jiao > 0) str += "整"
  }
  return (negative ? "负" : "") + str
}

/** 浏览器打印：仅输出单据区域 */
function handlePrint() {
  nextTick(() => window.print())
}
</script>

<style scoped>
.doc-print-area {
  background: #fff;
  color: #000;
  font-family: "SimSun", "宋体", serif;
  font-size: 13px;
  padding: 12px 16px;
}

.doc-head {
  text-align: center;
  border-bottom: 2px solid #000;
  padding-bottom: 8px;
  margin-bottom: 10px;
}
.doc-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 8px;
}
.doc-subtitle {
  font-size: 11px;
  color: #444;
  letter-spacing: 2px;
  margin-top: 2px;
}

.doc-meta {
  margin-bottom: 10px;
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.meta-item {
  min-width: 260px;
}
.meta-label {
  font-weight: 700;
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
}
.doc-table th,
.doc-table td {
  border: 1px solid #000;
  padding: 4px 6px;
  word-break: break-all;
}
.doc-table th {
  background: #f2f2f2;
  font-weight: 700;
  text-align: center;
}
.ta-center { text-align: center; }
.ta-right { text-align: right; white-space: nowrap; }
.blank-row td { border: 1px solid #000; }
.sum-row td { font-weight: 700; background: #fafafa; }

.doc-amount-cn {
  margin: 10px 0;
}
.cn-value {
  font-weight: 700;
  letter-spacing: 1px;
}

.doc-sign {
  display: flex;
  margin-top: 26px;
  justify-content: space-between;
}
.sign-item {
  flex: 1;
  display: flex;
  align-items: flex-end;
}
.sign-label {
  font-weight: 700;
  white-space: nowrap;
}
.sign-line {
  display: inline-block;
  width: 110px;
  border-bottom: 1px solid #000;
  margin-left: 4px;
}
.doc-footnote {
  margin-top: 14px;
  font-size: 11px;
  color: #555;
  text-align: right;
}

/* 打印：只输出单据区域 */
@media print {
  @page {
    size: A4;
    margin: 12mm;
  }
  body * {
    visibility: hidden !important;
  }
  :deep(.doc-print-area),
  :deep(.doc-print-area *) {
    visibility: visible !important;
  }
  :deep(.doc-print-area) {
    position: absolute !important;
    left: 0;
    top: 0;
    width: 100%;
    padding: 0;
  }
}
</style>
