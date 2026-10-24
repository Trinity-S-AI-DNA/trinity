import{a$ as e}from"./QueenComb-Bv3n9qgd.js";const o="fogVertexDeclaration",n=`#ifdef FOG
varying vec3 vFogDistance;
#endif
`;e.IncludesShadersStore[o]||(e.IncludesShadersStore[o]=n);const i={name:o,shader:n},r="fogVertex",s=`#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;e.IncludesShadersStore[r]||(e.IncludesShadersStore[r]=s);const f={name:r,shader:s},d="vertexColorMixing",a=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
vColor=vec4(1.0);
#ifdef VERTEXCOLOR
#ifdef VERTEXALPHA
vColor*=colorUpdated;
#else
vColor.rgb*=colorUpdated.rgb;
#endif
#endif
#ifdef INSTANCESCOLOR
vColor*=instanceColor;
#endif
#endif
`;e.IncludesShadersStore[d]||(e.IncludesShadersStore[d]=a);const c={name:d,shader:a};export{f as a,i as f,c as v};
