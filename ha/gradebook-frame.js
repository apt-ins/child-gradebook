/** Same-site address selection; credentials never appear in iframe URLs. */
export function selectGradebookUrl(origin, config = {}) {
 const current=new URL(origin),external=config.external_ha_origins||[];let target;
 if(external.includes(current.origin)){if(!config.external_url)throw Error('请配置外网成绩册地址。');target=new URL(config.external_url);if(target.protocol!=='https:'||target.username||target.password||target.pathname!=='/'||target.search||target.hash)throw Error('外网成绩册必须使用 HTTPS 地址，不包含路径或凭据');}
 else{if(!(config.local_ha_origins||[]).includes(current.origin))throw Error('当前 HA 地址尚未配置。');target=new URL(current.origin);target.port=String(config.local_port||3082);}
 target.searchParams.set('embed','ha');target.searchParams.set('ha_origin',current.origin);return target.href;
}
const SURFACE_OWNER=Symbol.for('gradebook.viewport.owner.v3');
if(typeof customElements!=='undefined'&&!customElements.get('gradebook-frame-v3')){
 customElements.define('gradebook-frame-v3',class extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this._epoch=0;this._chromeEpoch=0;this._active=false;}
  setConfig(config){this._config=config;this._render();if(this.isConnected)this._scope();}
  set hass(value){this._hass=value;}
  getCardSize(){return 12;}
  get preview(){return this._previewMode||false;}
  set preview(value){this._previewMode=!!value;queueMicrotask(()=>this.isConnected&&this._scope());}
  _isPreview(){for(let n=this;n;n=n.parentElement||n.getRootNode?.().host)if(n.preview===true||n._preview===true||['hui-card-preview','hui-dialog-edit-card','hui-card-element-editor'].includes(n.localName))return true;return false;}
  connectedCallback(){
   this._path=location.pathname;this._events?.abort();this._events=new AbortController();const signal=this._events.signal;
   window.addEventListener('message',e=>this._message(e),{signal});
   for(const name of ['location-changed','popstate','pageshow'])window.addEventListener(name,()=>this._scope(),{signal});
   for(const name of ['resize','orientationchange'])window.addEventListener(name,()=>this._queueLayout(),{signal,passive:true});
   for(const name of ['resize','scroll'])window.visualViewport?.addEventListener(name,()=>this._queueLayout(),{signal,passive:true});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)this._queueLayout();},{signal});
   this._render();this._scope();
  }
  disconnectedCallback(){this._events?.abort();this._deactivate();}
  _scope(){const preview=this._isPreview(),active=this.isConnected&&location.pathname===this._path&&!preview;this.toggleAttribute('data-preview',preview);if(active)this._activate();else this._deactivate();}
  _activate(){
   if(!this._surface)return;
   if(!this._active){this._active=true;this._network=new AbortController();document[SURFACE_OWNER]=this;document.documentElement.setAttribute('data-gradebook-surface','');document.head.append(this._pageStyle);document.body.append(this._surface);}
   this._queueLayout(true);this._bindChrome();
  }
  async _bindChrome(){}
  _deactivate(){
   this._active=false;++this._epoch;++this._chromeEpoch;cancelAnimationFrame(this._layoutFrame);this._layoutFrame=0;this._lastLayout='';this._network?.abort();this._connecting=null;this._releaseChrome?.();this._releaseChrome=null;this._surface?.remove();this._pageStyle?.remove();
   if(document[SURFACE_OWNER]===this){delete document[SURFACE_OWNER];document.documentElement.removeAttribute('data-gradebook-surface');}
  }
  _render(){
   if(!this._config)return;let url;try{url=selectGradebookUrl(location.origin,this._config);}catch(e){this.shadowRoot.textContent=e.message;return;}
   if(this._url===url)return;const reactivate=this._active;if(reactivate)this._deactivate();this._url=url;this._origin=new URL(url).origin;
   const hostStyle=document.createElement('style');hostStyle.textContent=':host{display:block;height:0!important;min-height:0!important;padding:0!important;margin:0!important}.preview-note{display:none}:host([data-preview]){height:180px!important;display:grid;place-items:center;background:#f7f8fc}:host([data-preview]) .preview-note{display:block;padding:20px;color:#59677e}';
   const note=document.createElement('p');note.className='preview-note';note.textContent='学迹 · 编辑预览不验证身份或显示私人资料';this.shadowRoot.replaceChildren(hostStyle,note);
   this._surface=document.createElement('gradebook-surface-v3');const root=this._surface.attachShadow({mode:'open'}),style=document.createElement('style');
   style.textContent=':host{position:fixed;inset:0;z-index:2000;display:block;box-sizing:border-box;width:var(--gb-layout-width,100%);height:var(--gb-layout-height,100%);margin:0;padding:0;border:0;border-radius:0;background:#f7f8fc;overflow:hidden;isolation:isolate}iframe{position:absolute;display:block;box-sizing:border-box;top:var(--gb-visual-top,0px);left:var(--gb-visual-left,0px);width:var(--gb-visual-width,100%);height:var(--gb-visual-height,100%);margin:0;padding:0;border:0;border-radius:0;background:#f7f8fc}.safe-probe{position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}';
   const frame=this._frame=document.createElement('iframe');frame.title='学迹';frame.src=url;frame.referrerPolicy='no-referrer';this._probe=document.createElement('i');this._probe.className='safe-probe';root.append(style,this._probe,frame);
   this._pageStyle=document.createElement('style');this._pageStyle.textContent='html[data-gradebook-surface],html[data-gradebook-surface] body{background:#f7f8fc!important;overscroll-behavior:none}';
   if(reactivate)this._activate();
  }
  _queueLayout(force=false){if(!this._active)return;this._forceLayout||=force;if(this._layoutFrame)return;this._layoutFrame=requestAnimationFrame(()=>{this._layoutFrame=0;this._layout();});}
  _layout(){
   if(!this._active||!this._surface?.isConnected)return;
   const vv=window.visualViewport,normalScale=vv&&Math.abs(vv.scale-1)<.01;
   const layoutWidth=Math.max(innerWidth,document.documentElement.clientWidth),layoutHeight=Math.max(innerHeight,document.documentElement.clientHeight);
   const top=normalScale?Math.max(0,vv.offsetTop):0,left=normalScale?Math.max(0,vv.offsetLeft):0;
   const width=normalScale?vv.width:layoutWidth,height=normalScale?vv.height:layoutHeight;
   const env=getComputedStyle(this._probe),ha=getComputedStyle(this),read=value=>Math.max(0,parseFloat(value)||0),safe={};
   for(const side of ['top','right','bottom','left'])safe[side]=Math.min(200,Math.max(read(env.getPropertyValue('padding-'+side)),read(ha.getPropertyValue('--safe-area-inset-'+side))));
   if(layoutHeight-height>150)safe.bottom=0;
   const message={type:'gradebook:viewport',width,height,offsetTop:top,offsetLeft:left,insets:safe};const signature=JSON.stringify(message);
   for(const [key,value]of Object.entries({'layout-width':Math.max(layoutWidth,left+width),'layout-height':Math.max(layoutHeight,top+height),'visual-top':top,'visual-left':left,'visual-width':width,'visual-height':height})){const valueCSS=value+'px';if(this._surface.style.getPropertyValue('--gb-'+key)!==valueCSS)this._surface.style.setProperty('--gb-'+key,valueCSS);}
   if(signature!==this._lastLayout||this._forceLayout){this._lastLayout=signature;this._frame.contentWindow?.postMessage(message,this._origin);}this._forceLayout=false;
  }
  async _message(event){
   if(event.origin!==this._origin||event.source!==this._frame?.contentWindow||!this._active||this._isPreview())return;const message=event.data;
   if(message?.type==='gradebook:layout-ready'){this._queueLayout(true);return;}
   if(message?.type==='gradebook:return-home'){history.pushState(null,'','/lovelace/home');window.dispatchEvent(new CustomEvent('location-changed',{detail:{replace:false}}));this._scope();return;}
   if(message?.type!=='gradebook:connect'||typeof message.id!=='string'||message.id.length>100)return;const epoch=this._epoch;
   const reply=payload=>{if(this.isConnected&&this._active&&epoch===this._epoch)this._frame.contentWindow.postMessage({id:message.id,...payload},this._origin);};
   try{if(!this._connecting){const pending=this._exchange();this._connecting=pending;pending.finally(()=>{if(this._connecting===pending)this._connecting=null;}).catch(()=>{});}await this._connecting;reply({type:'gradebook:connected'});}catch(e){reply({type:'gradebook:connection-error',message:e.message,status:e.status||503});}
  }
  async _exchange(){const signal=this._network.signal,auth=this._hass?.auth;if(!auth?.data)throw Error('请先登录 HA，再打开成绩册。');
   const attempt=async()=>fetch(this._origin+'/api/ha/session',{method:'POST',credentials:'include',signal,headers:{Authorization:'Bearer '+auth.data.access_token,'X-Requested-With':'gradebook'}});
   if(auth.expired)await auth.refreshAccessToken();let response=await attempt();if(response.status===401){await auth.refreshAccessToken();response=await attempt();}const body=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(Error(body.error||'暂时无法连接成绩册，请重试。'),{status:response.status});
  }
 });
}
