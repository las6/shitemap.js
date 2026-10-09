"""Wrap the original reference in a seamless, mirrored SVG mask.
The source bitmap stays intact. Reflection colour is supplied separately in CSS.
"""
from pathlib import Path
import base64

neighbours = ''.join(f'<use xlink:href="#tile" transform="translate({x} {y})"/>' for y in (-1896, 0, 1896) for x in (-948, 0, 948))
source = base64.b64encode(Path('public/textures/circuitry-reference.jpg').read_bytes()).decode()
Path('public/textures/circuitry-original-mask.svg').write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="948" height="1896" viewBox="0 0 948 1896">
<defs>
<filter id="ink" filterUnits="userSpaceOnUse" x="-40" y="-40" width="1028" height="1976" color-interpolation-filters="sRGB">
<feColorMatrix type="saturate" values="0" result="gray"/>
<feGaussianBlur in="gray" stdDeviation="5" edgeMode="duplicate" result="local"/>
<feComponentTransfer in="local" result="inverse"><feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/></feComponentTransfer>
<feBlend in="inverse" in2="gray" mode="color-dodge"/>
<feComponentTransfer><feFuncR type="linear" slope="-5" intercept="4.95"/><feFuncG type="linear" slope="-5" intercept="4.95"/><feFuncB type="linear" slope="-5" intercept="4.95"/></feComponentTransfer>
<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .3333 .3333 .3333 0 0"/>
</filter>
<image id="original" width="474" height="948" xlink:href="data:image/jpeg;base64,{source}"/>
<clipPath id="padding"><rect x="-40" y="-40" width="1028" height="1976"/></clipPath>
<g id="tile">
<use xlink:href="#original"/>
<use xlink:href="#original" transform="translate(948 0) scale(-1 1)"/>
<use xlink:href="#original" transform="translate(0 1896) scale(1 -1)"/>
<use xlink:href="#original" transform="translate(948 1896) scale(-1 -1)"/>
</g>
</defs>
<!-- Filter a periodic neighbourhood, then crop at the SVG viewport. -->
<g filter="url(#ink)"><g clip-path="url(#padding)">{neighbours}</g></g>
</svg>''')
print('Generated mirrored reference tile with 40px periodic filter padding.')
