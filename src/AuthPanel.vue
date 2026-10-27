<script setup lang="ts">
import {ref} from 'vue';
import {Leaf,Eye,EyeOff,LockKeyhole} from 'lucide-vue-next';
const props=defineProps<{configured:boolean;unavailable:boolean;connectionError:string}>();
const emit=defineEmits<{authenticated:[];retry:[]}>();
const password=ref(''),confirm=ref(''),show=ref(false),busy=ref(false),error=ref('');
async function submit(){
 error.value='';if(!props.configured&&password.value!==confirm.value){error.value='两次输入的密码不一致。';return;}
 busy.value=true;try{const r=await fetch('/api/'+(props.configured?'login':'setup'),{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'gradebook'},body:JSON.stringify({password:password.value})});const data=await r.json();if(!r.ok)throw Error(data.error||'操作未完成。');password.value='';confirm.value='';emit('authenticated');}catch(e){error.value=(e as Error).message||'连接失败，请重试。';}finally{busy.value=false;}
}
</script>
<template>
 <main id="journey-main" class="auth-page"><div class="auth-wrap"><div class="auth-brand"><span><Leaf :size="22"/></span>学迹</div><div class="auth-intro"><p>一份私人求学纪念册</p><h1>{{unavailable?'暂时无法连接':configured?'欢迎回来':'为学迹设置密码'}}</h1><p>{{unavailable?'请检查服务和网络后重试。':configured?'打开这份成长记录，继续珍藏每一步。':'设置一个专属密码，守护孩子的成长记录。'}}</p></div><div v-if="unavailable" class="auth-form"><p role="alert">{{connectionError}}</p><button class="j-button j-primary auth-submit" @click="$emit('retry')">重新连接</button></div><form v-else class="auth-form" @submit.prevent="submit"><label for="auth-password">{{configured?'访问密码':'设置密码'}}</label><div class="auth-input"><LockKeyhole :size="18" aria-hidden="true"/><input id="auth-password" v-model="password" :type="show?'text':'password'" :autocomplete="configured?'current-password':'new-password'" :minlength="configured?undefined:10" maxlength="256" required :placeholder="configured?'请输入密码':'至少 10 个字符'"><button type="button" :aria-label="show?'隐藏密码':'显示密码'" @click="show=!show"><EyeOff v-if="show" :size="18"/><Eye v-else :size="18"/></button></div><template v-if="!configured"><label for="auth-confirm">再次输入密码</label><div class="auth-input"><LockKeyhole :size="18" aria-hidden="true"/><input id="auth-confirm" v-model="confirm" :type="show?'text':'password'" autocomplete="new-password" minlength="10" maxlength="256" required placeholder="再次输入密码"></div><p class="auth-note">请在可信网络中完成设置，再开放外网访问。</p></template><p v-if="error" class="j-error" role="alert">{{error}}</p><button class="j-button j-primary auth-submit" :disabled="busy">{{busy?'请稍候…':configured?'打开学迹':'设置密码并进入'}}</button></form><p class="auth-foot">记录每一次努力，见证每一步成长。</p></div></main>
</template>
