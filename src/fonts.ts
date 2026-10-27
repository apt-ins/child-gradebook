// The same numeral faces, unicode ranges and calibration as HA's D-DIN option.
export async function loadGradebookFonts(){
 const faces=[new FontFace('Gradebook D-DIN','url(/fonts/D-DIN.woff2)',{weight:'100 500',style:'normal',sizeAdjust:'90%',unicodeRange:'U+002B-002E,U+0030-003A,U+2212'} as FontFaceDescriptors),new FontFace('Gradebook D-DIN','url(/fonts/D-DIN-Bold.woff2)',{weight:'600 900',style:'normal',sizeAdjust:'90%',unicodeRange:'U+002B-002E,U+0030-003A,U+2212'} as FontFaceDescriptors)];
 let timer:ReturnType<typeof setTimeout>;try{await Promise.race([Promise.all(faces.map(f=>f.load())),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('font timeout')),4000);})]);faces.forEach(f=>document.fonts.add(f));}catch{/* Keep a stable system fallback on genuine loading failure. */}finally{clearTimeout(timer!);}
}
