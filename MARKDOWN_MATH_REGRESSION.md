# Markdown + Formula Regression Samples

这份文档用于手工回归 `content.js` 的 Markdown + KaTeX 渲染逻辑。  
使用方式：复制每个“输入样例”到插件对话或翻译结果区域，确认“预期结果”。

## Case 1: Inline Math (basic)

输入样例：

```md
欧拉恒等式：$e^{i\pi}+1=0$，以及二项式：$\binom{n}{k}=\frac{n!}{k!(n-k)!}$。
```

预期结果：

- 两个行内公式都渲染为 KaTeX。
- 文本与公式在同一行，不被拆成代码或普通文本。

## Case 2: Display Math with $$...$$

输入样例：

```md
$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx=\sqrt{\pi}
$$
```

预期结果：

- 渲染为块级公式。
- 上下标、根号、无穷符号显示正常。

## Case 3: Display Math with \[...\]

输入样例：

```md
\[
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
\]
```

预期结果：

- 识别为块级公式，不显示原始 `\[` `\]`。

## Case 4: Multi-line align environment

输入样例：

```md
\begin{align}
f(x) &= x^2 + 2x + 1 \\
     &= (x+1)^2
\end{align}
```

预期结果：

- 按块级公式渲染。
- `&` 对齐位和换行 `\\` 生效。

## Case 5: Nested environments

输入样例：

```md
\begin{equation}
\begin{aligned}
a^2+b^2&=c^2\\
a^2&=c^2-b^2
\end{aligned}
\end{equation}
```

预期结果：

- 外层与内层环境都被完整识别，不截断。
- 渲染为一个完整公式块。

## Case 6: cases + piecewise

输入样例：

```md
$$
f(x)=
\begin{cases}
x^2, & x \ge 0 \\
-x,  & x < 0
\end{cases}
$$
```

预期结果：

- 大括号分段函数样式正确。
- 条件中的 `\ge`、`<` 正常显示。

## Case 7: Matrix

输入样例：

```md
\[
A=
\begin{bmatrix}
1 & 2 & 3 \\
0 & 1 & 4 \\
0 & 0 & 1
\end{bmatrix}
\]
```

预期结果：

- 渲染矩阵边框和行列结构。

## Case 8: \left...\right delimiters

输入样例：

```md
$$
\left(\sum_{k=1}^{n} k\right)^2 = \left(\frac{n(n+1)}{2}\right)^2
$$
```

预期结果：

- 自动伸缩括号显示正常，不出现报错文本。

## Case 9: Bare LaTeX auto-wrap

输入样例：

```md
关键公式：\frac{d}{dx}\sin x=\cos x
```

预期结果：

- 右侧裸 LaTeX 自动识别为公式（无需手写 `$...$`）。

## Case 10: Currency should not be treated as math

输入样例：

```md
价格从 $9.99 提升到 $12.50，每月多支出 $2.51。
```

预期结果：

- 金额保持普通文本，不进入 KaTeX。
- 不出现“半截公式”或吞字。

## Case 11: Mixed currency and real formula

输入样例：

```md
套餐价格是 $19.9，但 ROI 可以写成 $ROI=\frac{收益-成本}{成本}$。
```

预期结果：

- `$19.9` 保持普通文本。
- `$ROI=...$` 正确渲染为行内公式。

## Case 12: Code fence isolation

输入样例：

~~~md
```latex
\begin{align}
a&=b+c
\end{align}
```

正文里才渲染：$a=b+c$
~~~

预期结果：

- 代码块内部保持原样，不做公式渲染。
- 代码块外的 `$a=b+c$` 正常渲染。

## Case 13: Escaped delimiters

输入样例：

```md
模型输出里可能有转义：\\(x^2+y^2\\) 与 \\[\int_0^1 x\,dx\\]。
```

预期结果：

- 可被恢复并渲染为公式，而不是显示双反斜杠原文。

## Case 14: Markdown list + formula

输入样例：

```md
- 一次函数：$y=ax+b$
- 二次函数：$y=ax^2+bx+c$
1. 递推：$a_{n+1}=2a_n+1$
2. 极限：$\lim_{n\to\infty}\frac{1}{n}=0$
```

预期结果：

- 列表结构保留。
- 列表项内公式均正常渲染。

## Case 15: KaTeX fallback tolerance

输入样例：

```md
这个故意写错：$\\frac{1}{ $，后面还有正常公式：$x^2+y^2$。
```

预期结果：

- 错误公式不应导致整段崩溃。
- 后续正常公式仍然可渲染。

## Case 16: Maxwell equations (differential form)

输入样例：

```md
$$
\begin{aligned}
\nabla\cdot\mathbf{E} &= \frac{\rho}{\varepsilon_0}, \\
\nabla\cdot\mathbf{B} &= 0, \\
\nabla\times\mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t}, \\
\nabla\times\mathbf{B} &= \mu_0\mathbf{J}+\mu_0\varepsilon_0\frac{\partial \mathbf{E}}{\partial t}.
\end{aligned}
$$
```

预期结果：

- 多行向量微分算子正常渲染。
- `\cdot`、`\times`、偏导与粗体向量显示正常。

## Case 17: Schrödinger equation + Hamiltonian

输入样例：

```md
$$
i\hbar\frac{\partial}{\partial t}\Psi(\mathbf{r},t)=\hat{H}\Psi(\mathbf{r},t),\quad
\hat{H}=-\frac{\hbar^2}{2m}\nabla^2+V(\mathbf{r},t)
$$
```

预期结果：

- 复数单位、帽子符号、拉普拉斯算子与并列公式正常显示。

## Case 18: Einstein field equation

输入样例：

```md
$$
R_{\mu\nu}-\frac{1}{2}Rg_{\mu\nu}+\Lambda g_{\mu\nu}
=\frac{8\pi G}{c^4}T_{\mu\nu}
$$
```

预期结果：

- 希腊字母下标、分式与多项并列渲染正常。

## Case 19: Geodesic equation

输入样例：

```md
$$
\frac{d^2x^\mu}{d\tau^2}
+\Gamma^\mu_{\alpha\beta}
\frac{dx^\alpha}{d\tau}
\frac{dx^\beta}{d\tau}=0
$$
```

预期结果：

- 多重上下标、Christoffel 符号、连乘分式正常渲染。

## Case 20: Navier-Stokes equation

输入样例：

```md
$$
\rho\left(\frac{\partial \mathbf{u}}{\partial t}
+(\mathbf{u}\cdot\nabla)\mathbf{u}\right)
=-\nabla p+\mu\nabla^2\mathbf{u}+\mathbf{f}
$$
```

预期结果：

- 行内长表达式不应断裂为多个错误块。

## Case 21: Fourier transform pair

输入样例：

```md
$$
\hat{f}(\omega)=\int_{-\infty}^{\infty}f(t)e^{-i\omega t}\,dt,\qquad
f(t)=\frac{1}{2\pi}\int_{-\infty}^{\infty}\hat{f}(\omega)e^{i\omega t}\,d\omega
$$
```

预期结果：

- 长积分对偶公式可完整渲染。

## Case 22: Long chained derivation (stress line length)

输入样例：

```md
$$
\begin{aligned}
S_n&=\sum_{k=1}^{n}k=\frac{n(n+1)}{2},\\
\sum_{k=1}^{n}k^2&=\frac{n(n+1)(2n+1)}{6},\\
\sum_{k=1}^{n}k^3&=\left(\frac{n(n+1)}{2}\right)^2,\\
\sum_{k=1}^{n}(ak^3+bk^2+ck+d)&=
a\left(\frac{n(n+1)}{2}\right)^2+b\frac{n(n+1)(2n+1)}{6}+c\frac{n(n+1)}{2}+dn.
\end{aligned}
$$
```

预期结果：

- 超长多行公式不应截断。
- 对齐环境中的每行都正常显示。

## Case 23: Piecewise + absolute value + sign function

输入样例：

```md
$$
\operatorname{sgn}(x)=
\begin{cases}
1,&x>0\\
0,&x=0\\
-1,&x<0
\end{cases},
\quad
|x|=\sqrt{x^2}
$$
```

预期结果：

- `\operatorname` 与 `cases` 同时使用正常。

## Case 24: Tensor index dense expression

输入样例：

```md
$$
F^{\mu\nu}=\partial^\mu A^\nu-\partial^\nu A^\mu,\qquad
\partial_\mu F^{\mu\nu}=\mu_0 J^\nu
$$
```

预期结果：

- 上下指标密集公式渲染正确。

## Case 25: Quantum bra-ket notation

输入样例：

```md
$$
\langle \psi | \hat{A} | \phi \rangle
=\int \psi^*(x)\,\hat{A}\,\phi(x)\,dx,\qquad
\langle\psi|\psi\rangle=1
$$
```

预期结果：

- `\langle` `\rangle`、星号共轭、归一化条件正常。

## Case 26: PDE with boundary + initial conditions

输入样例：

```md
$$
\begin{cases}
\frac{\partial u}{\partial t}-\kappa\frac{\partial^2u}{\partial x^2}=0,&x\in(0,L),t>0,\\
u(0,t)=u(L,t)=0,&t\ge0,\\
u(x,0)=f(x),&x\in[0,L].
\end{cases}
$$
```

预期结果：

- `cases` 中混排文字与数学符号不破版。

## Case 27: Triple nested fractions and roots

输入样例：

```md
$$
\sqrt{\frac{1+\frac{1}{1+\frac{1}{x}}}{1-\frac{1}{1+\frac{1}{x}}}}
$$
```

预期结果：

- 深层嵌套分式和根号可完整显示。

## Case 28: Huge matrix (render pressure)

输入样例：

```md
$$
M=
\begin{bmatrix}
a_{11}&a_{12}&a_{13}&a_{14}&a_{15}&a_{16}\\
a_{21}&a_{22}&a_{23}&a_{24}&a_{25}&a_{26}\\
a_{31}&a_{32}&a_{33}&a_{34}&a_{35}&a_{36}\\
a_{41}&a_{42}&a_{43}&a_{44}&a_{45}&a_{46}\\
a_{51}&a_{52}&a_{53}&a_{54}&a_{55}&a_{56}\\
a_{61}&a_{62}&a_{63}&a_{64}&a_{65}&a_{66}
\end{bmatrix}
$$
```

预期结果：

- 大矩阵渲染成功，不出现样式错位或页面卡死。

## Case 29: Inline dense formula in paragraph

输入样例：

```md
在同一段里混合行文与公式：当 $n\to\infty$ 时，若 $a_n=\left(1+\frac{1}{n}\right)^n$，则 $a_n\to e$，并且误差可写作 $a_n=e\left(1-\frac{1}{2n}+O\!\left(\frac{1}{n^2}\right)\right)$。
```

预期结果：

- 多个行内公式连续渲染，标点与中文间距保持自然。

## Case 30: Unsupported macro fallback (extreme error path)

输入样例：

```md
$$
\require{color}\color{red}{E=mc^2}
$$
后面正常公式：$E_k=\frac{1}{2}mv^2$。
```

预期结果：

- 不支持命令触发容错时，不应影响后续正常公式渲染。

## Case 31: Broken delimiters with recoverable tail

输入样例：

```md
前面是坏的：$ \frac{a+b}{c-d}，中间有文字噪声 ### ??? --- ，后面是好的：$E=mc^2$。
```

预期结果：

- 前半段异常不应让整段崩溃。
- 后面的 `$E=mc^2$` 仍能正常渲染。

## Case 32: Random symbols around inline math

输入样例：

```md
@@@###%%% 在噪声中插入 $x_{n+1}=x_n-\frac{f(x_n)}{f'(x_n)}$ !!!???*** 然后继续文本。
```

预期结果：

- 公式被正确识别。
- 周围噪声字符保持普通文本。

## Case 33: Mixed markdown emphasis and formulas

输入样例：

```md
**重点**：令 *损失函数* 为 $L(\theta)=\sum_{i=1}^{n}(y_i-\hat{y}_i)^2$，并令 `lr=1e-3`。
```

预期结果：

- 粗体、斜体、行内代码与公式同时正常显示。

## Case 34: Link + formula + currency collision

输入样例：

```md
参考链接 https://example.com/$value 不应被当成公式；真实公式是 $f(x)=\log(1+x)$；价格是 $8.88。
```

预期结果：

- URL 片段保持链接文本语义。
- `$f(x)=...$` 渲染为公式。
- `$8.88` 不应被识别为公式。

## Case 35: Markdown table with formulas

输入样例：

```md
| 名称 | 表达式 | 备注 |
|---|---|---|
| 高斯分布 | $p(x)=\frac{1}{\sqrt{2\pi}\sigma}e^{-\frac{(x-\mu)^2}{2\sigma^2}}$ | 连续 |
| 泊松分布 | $P(X=k)=\frac{\lambda^k e^{-\lambda}}{k!}$ | 离散 |
```

预期结果：

- 表格结构保留。
- 表格单元格中的公式可正常渲染。

## Case 36: Blockquote + multi-line display math

输入样例：

```md
> 下面是推导：
> $$
> \begin{aligned}
> \nabla\cdot(\nabla\times\mathbf{A})&=0\\
> \nabla\times(\nabla\phi)&=0
> \end{aligned}
> $$
```

预期结果：

- 引用块结构存在。
- 公式仍能正确识别为块级数学。

## Case 37: Ordered list with malformed and valid formulas

输入样例：

```md
1. 错误公式：$\frac{1}{2
2. 正确公式：$\int_0^1 x^2\,dx=\frac{1}{3}$
3. 普通文本：done
```

预期结果：

- 第 1 条错误不应污染后续项。
- 第 2 条公式仍能渲染。

## Case 38: Deeply nested parentheses and braces

输入样例：

```md
$$
F(x)=\left\{\left[\left(\frac{1+\left(\frac{1}{x+1}\right)^2}{1-\left(\frac{1}{x+1}\right)^2}\right)\right]^3+\sqrt{1+\left(\frac{a}{b+c}\right)^4}\right\}
$$
```

预期结果：

- 深层括号嵌套不应导致截断或错位。

## Case 39: Long line with many inline formulas

输入样例：

```md
同一行测试：$a_1=1$，$a_{n+1}=2a_n+1$，$a_n=2^n-1$，$\sum_{k=1}^{n}a_k=2^{n+1}-n-2$，$\lim_{n\to\infty}\frac{a_n}{2^n}=1$，$e^{i\pi}+1=0$。
```

预期结果：

- 多个行内公式连续渲染时不漏、不串、不乱序。

## Case 40: Newline-noisy escaped delimiters

输入样例：

```md
模型输出可能断行：
\\(
\frac{1}{1+x}
\\)
以及
\\[
\sum_{k=0}^{n}\binom{n}{k}x^k
\\]
```

预期结果：

- 转义分隔符在断行情况下仍可恢复并渲染。

## Case 41: Formula-like code should stay as code

输入样例：

~~~md
内联代码：`$x^2+y^2$`，代码块：
```python
expr = "$x^2+y^2$"
print(expr)
```
正文公式：$x^2+y^2=z^2$。
~~~

预期结果：

- 代码中的 `$...$` 不渲染。
- 正文里的 `$x^2+y^2=z^2$` 渲染。

## Case 42: Mixed Chinese punctuation and formulas

输入样例：

```md
结论如下：当 $x\to 0$ 时，$\sin x \sim x$；因此，$\lim_{x\to 0}\frac{\sin x}{x}=1$。另外，价格￥99与$99.00都不应误判为公式。
```

预期结果：

- 中文标点与公式混排正常。
- 金额文本不误判。

## Case 43: Unclosed environment then valid environment

输入样例：

```md
\begin{align}
a&=b+c
这里缺少 end 标签

\begin{aligned}
x&=y+z\\
z&=1
\end{aligned}
```

预期结果：

- 前一个坏环境不应导致后一个合法环境完全失效。
- 不出现整段空白或脚本报错。

## Case 44: Very large synthetic stress paragraph

输入样例：

```md
压力段落开始：在随机噪声 abc123 !@# 中插入公式 $f_1(x)=x^2$、$f_2(x)=\sqrt{x}$、$f_3(x)=\frac{1}{1+x}$、$f_4(x)=\int_0^x t^2dt$、$f_5(x)=\sum_{k=1}^{50}\frac{1}{k^2}$，再拼接文本 lorem ipsum dolor sit amet，继续加入 $g(\omega)=\int_{-\infty}^{\infty}f(t)e^{-i\omega t}dt$ 与 $R_{\mu\nu}-\frac12 Rg_{\mu\nu}=\frac{8\pi G}{c^4}T_{\mu\nu}$，最后追加价格 $12.34 与 $56.78 以及结束。
```

预期结果：

- 大段文本中多个公式均可被稳定识别。
- 货币金额不应被误识别为公式。
- 页面不应明显卡顿或冻结。

## 批量压测（可一键复制）

说明：

- `Batch L`：轻量，10~20 秒快速验证。
- `Batch M`：中压，覆盖主要边界混合。
- `Batch H`：重压，长文本 + 多公式 + 噪声 + 异常恢复。

### Batch L (Light)

复制以下整段：

```md
[L1] 行内基础：$e^{i\pi}+1=0$，$a_{n+1}=2a_n+1$，$\lim_{n\to\infty}\frac{1}{n}=0$。
[L2] 块级积分：
$$
\int_{-\infty}^{\infty}e^{-x^2}\,dx=\sqrt{\pi}
$$
[L3] 裸公式自动包裹测试：关键关系 \frac{d}{dx}\sin x=\cos x。
[L4] 货币不误判：价格 $9.99 -> $12.50，差额 $2.51。
[L5] 混排：**加粗** + *斜体* + `code` + $f(x)=\log(1+x)$。
```

预期：

- 普通公式都渲染。
- 货币不误判。
- Markdown 样式不被公式解析破坏。

### Batch M (Medium)

复制以下整段：

```md
[M1] Maxwell:
$$
\begin{aligned}
\nabla\cdot\mathbf{E} &= \frac{\rho}{\varepsilon_0},\\
\nabla\cdot\mathbf{B} &= 0,\\
\nabla\times\mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t},\\
\nabla\times\mathbf{B} &= \mu_0\mathbf{J}+\mu_0\varepsilon_0\frac{\partial\mathbf{E}}{\partial t}
\end{aligned}
$$

[M2] 张量与场方程：
$$
R_{\mu\nu}-\frac12 Rg_{\mu\nu}+\Lambda g_{\mu\nu}
=\frac{8\pi G}{c^4}T_{\mu\nu}
$$

[M3] 分段函数：
$$
f(x)=
\begin{cases}
x^2,&x\ge0\\
-x,&x<0
\end{cases}
$$

[M4] URL/货币/公式冲突：
参考 https://example.com/$value 保持文本；公式 $ROI=\frac{收益-成本}{成本}$；金额 $19.9 不是公式。

[M5] 噪声干扰：
@@@###%%% $x_{n+1}=x_n-\frac{f(x_n)}{f'(x_n)}$ !!!???*** end.

[M6] 错误恢复：
坏片段 $ \frac{1}{2 ，后续正常 $x^2+y^2=z^2$ 必须可渲染。
```

预期：

- 复杂块级与行内都渲染。
- 坏片段不污染后续合法公式。
- URL 与货币文本不被错误吞噬。

### Batch H (Heavy)

复制以下整段：

```md
[H1] 超长混合段：
在噪声 abc123 !@# 中插入 $f_1(x)=x^2$、$f_2(x)=\sqrt{x}$、$f_3(x)=\frac{1}{1+x}$、$f_4(x)=\int_0^x t^2dt$、$f_5(x)=\sum_{k=1}^{80}\frac{1}{k^2}$，再加入 $g(\omega)=\int_{-\infty}^{\infty}f(t)e^{-i\omega t}dt$ 与 $R_{\mu\nu}-\frac12Rg_{\mu\nu}=\frac{8\pi G}{c^4}T_{\mu\nu}$，并混入价格 $12.34 与 $56.78，最后追加 $a_n=e\left(1-\frac{1}{2n}+O\!\left(\frac{1}{n^2}\right)\right)$。

[H2] 深层嵌套：
$$
\sqrt{\frac{1+\frac{1}{1+\frac{1}{x}}}{1-\frac{1}{1+\frac{1}{x}}}}
\cdot
\left\{\left[\left(\frac{1+\left(\frac{1}{x+1}\right)^2}{1-\left(\frac{1}{x+1}\right)^2}\right)\right]^3+\sqrt{1+\left(\frac{a}{b+c}\right)^4}\right\}
$$

[H3] 大矩阵：
$$
M=
\begin{bmatrix}
a_{11}&a_{12}&a_{13}&a_{14}&a_{15}&a_{16}\\
a_{21}&a_{22}&a_{23}&a_{24}&a_{25}&a_{26}\\
a_{31}&a_{32}&a_{33}&a_{34}&a_{35}&a_{36}\\
a_{41}&a_{42}&a_{43}&a_{44}&a_{45}&a_{46}\\
a_{51}&a_{52}&a_{53}&a_{54}&a_{55}&a_{56}\\
a_{61}&a_{62}&a_{63}&a_{64}&a_{65}&a_{66}
\end{bmatrix}
$$

[H4] 环境错配 + 恢复：
\begin{align}
a&=b+c
这里故意不闭合

\begin{aligned}
x&=y+z\\
z&=1
\end{aligned}

[H5] 再次验证恢复：
后续合法公式必须还能渲染：$\int_0^1 x^2\,dx=\frac13$，$E_k=\frac12 mv^2$，$e^{i\pi}+1=0$。
```

预期：

- 在高噪声与长文本下保持稳定，不出现整段空白/卡死。
- 未闭合环境不应让后续合法公式全部失效。
- 末尾恢复验证公式应继续正常渲染。
