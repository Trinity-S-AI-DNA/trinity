import{a$ as e}from"./QueenComb-BZ3LplIF.js";import"./index-DSITshk1.js";import"./react--6nd5XBq.js";import"./motion-CvAcPNoJ.js";import"./router-DxTwtRHr.js";const r="passPixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=texture2D(textureSampler,vUV);}`;e.ShadersStore[r]||(e.ShadersStore[r]=o);const S={name:r,shader:o};export{S as passPixelShader};
