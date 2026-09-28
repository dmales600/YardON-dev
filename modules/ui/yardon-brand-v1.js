(()=>{'use strict';
if(window.__YARDON_BRAND_V1__)return;
window.__YARDON_BRAND_V1__=true;
const BRAND='YardOn',VERSION='v1.0',LOGO="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAeAAAACkCAMAAAB4tA1pAAABgFBMVEUQVHMSZ58UTWQfkKUNLVUkqt1GVmRVZXRgc4Os1OwFLl5MWmiVo7ETITQBJFEsSlhcpuUkyOJJVWEtW1/W5PEpM1pXV6qqqqp2i5sOHCN/f/8Af/+TttYJIztteIQndNF3xu8AqqoAVaoGPaAKaQpqAAByrKx///+qqv//AAAAAKpdoV0AqlUA/wBVAFVVVQCqVVWqqlX/f////wD//38AAADV5fQAGCkAIycHxvAGt+4Ep+8CZ+0BIS0El+8Dh+4Dd+0BHCsAf38U1fPI2ed/f3+nt8YAVVURKTcAHBwNaNAABROVpbMLWs8BW+0AAH8KRo21xtSHl6Yl2PAQddMQZokEFywBODgRiKxUVVUACSh2iJZoeYgAADEPV4v///8DJkgpOEZVqqrh7ftTZXQAFjoCNksEOlAKOoYVlbE0RFMAAFQThtAUmNMA//8AAP8sO0kWKjo+Pj4Sd68PSFt7kqECGkYHLGwKNXAYptUACCMBF0QAPHoLVq8ANVBKWWeOTuGeAAAAgHRSTlPh/LP7Zf5X2tn+06TyXLBn/v06FvwSAwPpKAIC/4id/v4DA/8DAgQCAwEDBAMBAwMDAwIBAgD+EBP+/v7+KP7+/igC/f4C/gNTDf0p/v3+Av7+/P79+UsE/gNJ+/YG+wGRaQP7726Qcv3+kAP9/gEBim4E/27+ifLu/jR0BP6ryWkS0NgAABysSURBVHja7Z2JXxrJtse7cUFBdBLF6EzmZjJ37tzt7e+VECMiTINshiUKEkB0XKLi7sSoGeO//qq6urqru6s3IFczn/rNRNm6gfr2OXXq1KlSAF0pCxXpo6IM9XTCLOCSJXR/aKvV6i/l/inb4mR7B0wUjTw2zBxrXwGr9uxGoJXt0/WQZXcT2Ra33i8C2IPFyz14b949m42qsYAm9DhH+uCAWfopWnOtaI1j++oAc3HAXBwwFwfMAXNxwFwcMBcHzMUBc3HAHDAXB8zFAXNxwFwcMBcHzMUBc3HAHDAXB8zFAXNxwFwcMBcHzMUBc8BcHDAXB8zFAXNxwFwcMBcHzAFzccBcXyfg341KYim30d2XL5MGTSIlXerly18nl3lbcwvm+hKAY+9p/YZF7ik/fzNrAoq6rXtKfpJIeTDM2/qBAPtE8VKndZYOmBpwLyH79yJv7gcBPLSo6TWleZZe6fTLq19c6q0QA7wbfhDAgaM4GzCD8Su2nPm+eiIkOOCHAgzBxo+OoRBi+Ovm9Wsb0ENIGu4nT145CgEWuQU/oAUfCT4oQZFPueMzCj0kqLeoI7TDtJdqjwpDCDC34IcCvBpfvBz8ku+xN8ABPzTgCXDypd7hBPx2wF30wwKOQwv+Yq2/DN4fcAt+eMDJXhhaSH4yqQDmFvyAgFdlwMu///gd1gmW7GAduTg8rwBe4xb84IC7VZ6p2XyeA35cgH/zMbXncAqfKIuVnkSn5YAfB+Af4e2h4xukY70GBBvzngS+gbdWEsMc8OOx4BPweWBIl5gkeaz1cctB1InMV5d0VvVkYBCcchf9mPpg4QBBndenKRcXF0WrURQcAg08efsLE/CTgRCo8T74UQFOCDdG65URH29UmXRqICPSfHX+eeA9tnsO+MEBL5FhEuR1Y+YLbfhIuAXm2dwiqApDb39hAx7YU/w6B/zwgJdy2IJrYG/dzBcRvvxs7oZr0OKHLPrftwM+FLZhwHsHrzjgBwScUwGjMQ/sho18IeBjcZPBx8Z+fVSiY49b8AMCztOA4Q/BPBsslwJsnOsBwZf67OxXdencgh8RYBQ2rTHC6EXUDScM3bBv4Ak7fn47JABt6MwBa0GL2zpjq+NleXgjM2CEY51lwIuLqwH6FD/CUfMTU7EO4ZuQB0jWgFPTdaTpespl06SmkeABpmfqv0LVnc8gv86V4GczHjzt/ljL9vd2eZ/YvDzpzYKvV2nAMJYSDhh4Fxfj4jj4Tktw7K0/YVRjYb66QVU/+uDkv9jU2j0UgLIvNnTCfDXjUjFyiKZEYjZRlQWc5+7JGyUYgJMwNj7WoyWENz6RN/03MCgyK+5QgkPI6FCyAIcnsSYSwI0Np0BMOWAybMykzQ4/fTocdjxFNvyUaBhrYgL9m0C/aE0MPw3DdmmfUgdHJp6aNKydjXp0cjYvf17GFTr4WVgT3RQYwxeJwl5Yd1lHBVGVMKgZGttVTJD3EX0IsM5Fo9Nuiiy+i/EjYppygoNdUvkWTfwmgQPgYEGRPwEuHOFcgFhTeX0lCCb15JtpqEbI/kKpg4nG2Fg6PZZ2oULFH4zpXGqwkHapwtjOcAyYvtN3ICYM3Ay9cq2hGxHayYnahKGBJ0+U8sYnQ6J9gdUJ8BE4QyIDMLz1eZ3BdzEeX71WLpGqMGTJN0P1v+w+OAUmKnPbc1DbU/5ZUHf0eYmmNCdLaoZ0V08K+Kem5MezDqcYLm/PuZZUHgvSvmVHYhy8zZL5WNzk7wUPdBU4wntCOAner9PPiHv2NiyQVz4R8wzA0CVBJ23GCwW74Q5KeOk+rg7w+p7OxNhBVhtsVZRWKvvzDjZ8ATIa3xg8luY7UcDPlIO218kFGE7PeVJ5JKZ9rh3J/YGQcbk5qPuYAOyJnvlCjgN74FSNfI3P2PXDAilgn19jAi6C6sYxi298tXQFwuBWuLGoe387YM54MaNomjAARbf2q0+JL4PEDGn6yqCdk/YOeFsaiYFuAMuMxyaoTwPtrxu+EI+opif0gF+9Em0JOwGGY6BNkYE3Dl94/Q7lQixWNtAJLFvAlA3Ple8jNtZXB7GRKcI3ozP202lwX1a96gho/9RHwPCM/gj4964Ao+ttS7VhFLV2xRd5adxoZsDztjbsCBh6hsClCa8MWAzsCgcWa1eYfC0SHX8FhwWVsPW12AF5vwVfyH6roDVp2gemXQDedhaxw/Qh+FYPeHt7SpH8wimTtK66ESNXLYx5uuT76tWBD7At2N5LuwEMhCMDXcR3YeWuJKyzFqfA/17dCMA1YPBMI5y+t0oD1Cm+jQwwjIZmm7RlVULg1CaKxoDLBUeNqV4BvmOHBpyu2B5YqRTS6geauldMGEak4nyXfOeH1uT0IQPwvJ0Nq4CH1m7ZgOFZd+VuOK7jm1tZubs7tliD9gtyKElLwKbFZ79ShINWI7qYv6zxTRkGx8Gy3qXaDpMw4MbZ4JaDJoJN5bzpYfCUAiw1z60OHsSaCPorkna91ZWU0MGrrgijab31TURRBmxo9vl5cc/JguetAcO23RSP4kb7teELO4wYM+MkA55nri4M2hOm4qu5xqCho57WImjCY8IyzoKA8YuaeRd5lapyVUlBXZAFu3lnDQbTalyvDCfokOXmYN1eAwPrBzeoifG8PHaKJsD4BXDEclLsFjA4vb2+1OHF9ntktYp0aK0KfgdeACfbgLQGItw222+iSfnnZ/qhZZvAl/wk1GqErEZcqgU38/WLlIPaIK+cmoy6VcD/Ha7bKYW+A/k0M+QbEcDz80Oi8Nt7R/0mrKu1cUbA8+SnrPU9KwsmK0FtAKNyjSOaL7TfFcyXRXjelOBwYcFAI1w4NBKG/a/GN2TsfzUH3UgkGgrqe/NVog6Y0+4teBocpskVk/JowfAKw1fHdqOKfU5+TcUlfnaXzvatmwEzl+Ovf2aOMSnAeUvAspM28l21XAsOh2wvgVfAST1h4/hI639DBvuFIEPKMOv5Iaj5lJMUziyc9LeeANdPlZPDwY5XwPBz+/DHrigf5p0KGNH6nZoUZK/3SSZBXq2NG1qzBTyEbLjYJWDYuwdEjS9y0KuvLVb8zx98tuJrb8F6wr/S7TRL+M6NbZHxiibiRadk3+5XTLiRAP0ADDKNrgGnyKWHr7YiBXj9s7s1nCdABXxjD3h+6HIPmAcPKuAbDHiBDRiA2+tVW74q4QMhcgJsAQ+xAets+EzzsBcgsUP4Vs5MnneamAnqnOFJMmPqkLqd/JKAiy4AVxs6wFUN8Hu3856+Y42QHeDX8zeX5n44TwG+tQOcBJ82VmW+coCVW2TsyYLCOTgAzlt/dVvAsg2XtfTPtJbfoPh+ayJA8mCwFeEhYdJp6i4SJuDEAwC+6Qbwaz3gS5XpMb0yAb5i3Wfpol87AIbtPC5SfFkb76CQ7kZXweERMHxfky+G4yO/jf0CkBiRVIvFba7Yu8QmqAGuumDUI+BMw+Cib7Sg1yVgNCOvEMKANy9lmvDfsXCJFyfIhVXoByLc0R9OqjVuNuwBQ12LqzjAysWZGyvJfKv21Rj2FpyiCMMWlaPlvJpkrhyCv5qPUNy6BCPVU6XjUyJpOPxM9Q74XGHUI+A2DrJuMKz5S9eAA8cqIdWCyTqiwOe1Y31N1fq4gbBaOOkIGI2Vcrmcwpe9ddbNWoY9ANYBnrd20UXNH0uQ8LMLbSw5V2Bkt1+qDjp9SLIfMHZNqxmkFAtw+aEAh2TAqPUu99xulDFuBLx5qdL8DDbXDJWvyIZrXQGGF8ZmSeOr7Kmk31VJ3AST9RT65iRT4BGwnHEmRBtb0H79aYpv0Vy8tkNSHJr3bqsPNhNmDF4t2HKY1KUFY7kHHDhSDjlWLZi0/tHnE0hYv6HZ8bo+CFJd9LGziz4FgTsIOP7aYu+sG1ZGVFez5gwY+WQyYSM1tvL3aRv7hbBgRCUpEXTd1K5zZb/ZhOExHiz4ZxKz9QFwsVfAwAQYnmRwQ+elF1+vC/QXUy3YBWDopD/erSyZ9sBTbPn1gYCL1mDXGVPK1kL60kI3gOlZ/YYf85P5mssb62Dwg4J/gp4grIOztNqRf8u6KPAE0cXkhYN+Vl0EuRy6jaIxYBXG5aYHwIvKsj+ji4aAl+H9DVRzo1s9VtW8NAGMDhfyH20BQypX+6tsvtDHD31TwAVpzVDWj0vaxsb8h0BX0ODCgjsUYcnOfkE779cSk0X9E6NWkbRmwbMumjekuBB1fqo3C9YAe7BgZSpeBSwqNVQIcBL61XPh6FjZepIsTKiqkZZA6nGOhVtHwDWwWzqyAjz0w6g8C749VQ6GClNk4i49Mmi2YPtddsJa5ZXtDFNKjaZQisMwt9iYs4ik2wRw4/tzB4XO6OnCVA+AD/WAFz1ZsBXgRRkw+A5Gv4a6uSNhF3QBuAhur5V3e23arfR44EMFqlApTE3dn41RBU1jWlaYAK7aF77XoGuTHPkWleaTUASdsmIPnXSdDThdqXyQP7O1CiTeQyV+F32xYKXpegJMOF7KgEELzQUtmgif4kyW9pATYPiF6OId/Za0xxvju9VEopqY/b5SDlKAdfkJMg52AAzdKG3DFvbbVtPO/nz7xNi0ERJJ72T19FXAXpRWh+C9WjBhMw6AR8BoYTYTsFy7fKSvmzsqfQ+fK+oAv3N00Z8vjxfZhI/X1A+caZTv9YDnxkJ/qXsCjIafKmGLGg/KQQ8ay3PlDGZDLdBq9wq4rE0+PgTgOGZmCRh2uNVrGBzFqcK5o9IV+EdLAxx3BJwE4+KihWS+teV6vT65nBkzAZaa3lw0Hn+SfJTfokqLjIXSh+xTkJx05Vxnwl0ALu9o5ev/esCrSi0NBTgu19dogJGXRpNBxrLmlzJgcrg94BY43zhi0oUR+KU62XyhWbBUaSqqFJQiDTwVggo+HBef/ZMUPzbY6x2+JQ66vBNibr6WCCkZk9EdQ5WuR8BS4Z4qMOsJcFVtQi+A4yoheAoFcFwPGNrw7vWlrmxOJgwBx9XDbfvgf4DdDVKXpa+/g/Z7GWiRr0sBLhxmMngN3NZIJaNY8Ge3gFPtYXXSp8iy8MPnigHvQPn9fvSP1o5/J6066VS3gCU4DJig37hXwLKVxRfFcddBlhkwaXp4lVCoqteXR3rCG5utWx3gWwh4gQm4oyvaia/Gl1YV5XK5u0AC/Py3v7Wh/gZdK3HRBa1hJgp/kk3YC2CgAU4ym05SGViJqnmtmwGXzVFzWrNa/ECjeT8R063t6wEwkI0EW4XYnQV3rAEXQSIgxg2Ex0MU4HcY8AqzZOdWWNVZL0YLf754cRcI6VIDFQVwZXB5Ul6G3prOj+BMHwY83zvgNtjxYIajVKKaHgdnzg1rcX1kiYXUCMjraqt5YFjl2wPgzhcFDDvR22vxSFccuboRKKm0bQDDr6Irq4wvyn+s4Ruk589nBP+fVAUjFGDiGb8Fw4UR9BX7Bbiu1VG70phPi7PbVC7aPLtOTivNEP/zTB8B7Iz2ADhEAMc9AV4ihDDgu7h2kiQwEEZT9lr13OrdnTyJj27aWXBrXCRgZao/jGJh+5BIUhF6xbEJNYquDKqTSX8HTTnh0CfASRBreouDoZMumgH/1+QyXfKWhCjPtGr1M/D0wgyxJ8C7pe4AI2hLFGB0F/4zAEax9Ec0Z48QL+Hym9WlJQrwOzbgEzhAwh9s6JsfflDBqj2gvFKHjCiCFGD5S9blb3oom3CfALeplWYuBzp+qiPVLLhmdlVnZJGiVGHmv3sAXNRctBfAOY0QHibdEWZGwCiNH1CfNcgaMOS7QfqBOPHM3yg2LBkW20HAxEWnfZmEEhDXU2CmMAim+wO4Ds4KjgGWIdCCTTztDBjpfUOyqN7Fc5meACtL4jDgU2jBpCHFgDu8JzTgkBNgSPg2cLdqATjEBtwBV6XVJd26BuzmEevnNoCldGVsJngWk4sX28G0nLDoQxRdB1XFQaebIw7yjzS1+YiaG8BP1QwLk7AnwM+Ip8G5aBUwbL7cx3fgx6K5MLpDfnfgrWLxOzj4oQEXjYDN6QpgQTh3jSx4xQQYDZBWtY5bQwzfMffNqHG1rAJYtbCp9NjO4WwEur5CJQQjnb4Mk5RmG/W7KHwN7ag1ef/jyoKnqTy4eZbSC+ALkFCi8sY5DsUhYNJ4G+NuqnZBPnC3YAf4hDVjwCRsAbhILqE4be2yoAGPmjs7PWC8y0Wleb91X54Kgp/7ADipLgU2ThKydf7BuNSBDJOqVvWfoeYoRXiZCTj/bPqZXqln9KomtPxCreceUYZp2FZwG5YCV592HXR1FShBpwqFCcmAx20Bq14aHrNAK3cdYgAughCOvMnHOlKHR4Zgy+yiqW0MpDJaaYtGoz0DrqsGBon95Ig3+U8yJ4Hm/pddAZ6EbzGqDbCsLNhJ1cNG2bC6MC9QUe2dWLLV/v5+SVzJEUBL4rUyJXC3RB4ZZyUdi5DwRm7BKCZgeDV8xHxJdPWDNjyakyTJFWCiHeiUCOBkt4BTxEHbbQag+7oJzGSu7FNWrTlacBhkRgjh5z7dXlcEcNOwpZZZwZ0CaZ6Zc5IsCYhLJk+oV46SntDduBHw3bhVO46XcmbAZhddJDEZHB99Qw99LfnaAkZVL70CvlAjaOigXVUW10FIc9KTNOCMZYk+JLyjEhYYFjxXdtolqzxKTzaSqsWrDX3HuOBeuf13eIW/CnjBCnAHXUk5F4BBK0CiAnV4hH0zGiCVWduRYMCH6S9kwdAeG1oVnruRRhgIipMeCaXQqXyOgEEUEi6rhPNatjK/M+p5B5dmTPEBRSom9kz47iMggBccAEPdBsQVR8A/wgFSDnfw+JMs4ZsvXqD4Ctnv9rYZcKgydX/o6KK77oOJg/bnJ92mCtqq2QnwopikAEdtqoY0wmlIuNY1YAmG0CTgPm1B34laEbemF61c78qnOQXjot5ps234NlBaMXgAYx/cAp/21RBOf83l4AAJEoZjoLREFz+i8otMI+1X3KgEHVm5n4DlFIekDDwu3AKuqU76QwiE3QGGZw+pFfjp+3zXFiw1z2lXk8B9niumbxTJfEvjuMgKAi6pgG2zJaQfVs6yYgSMAizFj+vQylNIJcEf9PuDwxPDQTT3ijIKeBY2GAbDwbC8Xkgq+IPw+Wa6by76P0BViaDRUm/gWirT0ZF8LUXuNDOpmu1lkVBXVZT9ysInNWJzq+f+DF1PBJ104C635AWvjHilFFD+UkZRBowftQPcQYRXqHMYASO+irOXIzo0MagOkEY28SUdOpS3gKPqKEAEWkUVLfiTmlv5/FkI5INkDm4HB1mvh9Z2uwPcJstLy37gRTX4iVQn/dQh0UHNkeYFlfCO0mHfegE8Whg5zBsLPt8FSmLOC2CI5G7/qqVeIhDwG/nZBdt8J7wcrvYpwiv6YZLGd0kZH/2gRdE4hRcLVtLlQmMCXumFMSI8Ty7zjYX8lXS6Epwl68OaefB314CnweDIhwaULogV4EMzjQ+wudteCLfB2ciHmQ8fZmaEfBhsNeGNmQ8C+E/7o5ZTeaHxAWnmwwhe61gDvgY6kQs1GjvBw1nWntHj16W7nLVWjBL3P35PcbsqkSdKVw7ptPF9UT3LnTHIgq7kDQas0tVStPVaimyrAO/NMOLpSmgQx7vlnbxsdxIymb+4BozcoTwJH6EfilGbZHtT5vz8PJM5j0UjkQi8Df+PZaMOx8yCfCaEiwJCZBlE5Bw/cO68lTd7u2hkxFeB633bDAel64/jV+/orRkSAfUp+yXsxVPw6eO1+uJxoADehK3fQV30mwXNRb948YKMkeQKul+ht9wuN/wVabsSOiQriKjY4k9oWUmhCXtgGFg3SFQjA553CbifUi+TLMgq2w23si3QchxE96RJSwOr7u5+kiX/Uu/sovu75D/0/65cVKLbeiPx6RPebM3FFgWJqrIx22AVUIBPKfdN+oMFtPR7JfdCdvwpMNvcTt9nEqERaSqYH2OMhwfTc5WzWMxXmKvsQtbSnGrBbgEzFqAW8WPeL49WOByNhKNh2Whno5EosmQo2oiz0Ww0mq3RPXMtjDQ5WQtr4XU9hbabr6cclbQxLS86Pe36CtNfYCrg38Eu1T3r+3zxI6orkGc6G+jaOhyTZkBwDG3sSGsmdFjGC7ZGpPRZcG5KzsjKuegHsWBkxJFIVrtJRF0DyiPZSBaq1ep0Wl/uw3ROiRBAWsUi/ol+o58dBrZiR5arN1Je2ylSgEHo4x0dYeuC7V0UgbdRUdQMaMu7vM6ggDNvnP0SpqT7bFsBXIDRllxd/LCAI2bALd3zRkHSs+APIxXwu4+iJV883kYrX7crKLYLlqURVkh7Ai0YbVV1XpkrbOXPzs7w3N6DAc5GW7J1kh86jPpH4a0oFISL7tX+cIDH84GSNd8W7hH+DwQlqeE7uy9sjx2Caa3fUX6HUTlSuSncw1DaTwUDGPC526rvHoU4RSNehLwzQA661QJ/OBHAgdIKU29WSoG8mskbbKA5lSk0V/K/zKGnD8bWaPdXtF0O2p3zXws4G+mLstk/mAW/WVgJBPb/vP9nKNGo/YA2sGiDLbQ4WirczzIHe9DOg5UpCVrxFv0wcdFfDHALjogifdYfxZ4VCw5UP9G60vSpRQ3IiiAW3NkJTticcBC9QJ+U+KKALa026kWWnP8wLtrly1MoCe3wGvSC9pcH3EJdZ7Z3tk6U8fjpqwfcSv7OVq2jDsTQAO1iEoBfwx3dAK1I/VXMTvivAExedNTRdue7Fgb8fT8B1xhoo/0Ti3Pt6wX8xr0Fd6VAfwGzzJbNKWuSktEwyiXlbPbrDbLe3d6+Y+v29jZ/Sz9brZLHbxO35CH0YCifT0Dhu0iJEPq5G5AnG/oCOJp1Z7bdhFWuzNlxsuKRAv7zvqVKLrRhpTWky2O0bWrvgDutrAMS627Z3fgowrRmw6tc5gsfC+DQxxUt+cyo68vldCXz8fhS3CzWJg+GLdM2egRcjNpbm4N16o+IRPGDnuxZ/2zta7JgG8DGxRDOcC32xIOAu58gAXatb2e0eqIG3vh5u4SH3UX0lQTWQh7NMSysWFQaKJXZeNUpWXV+hH+i30fxRWfrlffE6yEXbWO7bLYe+2GHUZK1nyj+9BUABuP73XawWi/L0uUlSoStifCm/HerE6DTX7xZNque8ldmYzdfVV9XHkQAEZy3YuexoDbVG4q0W240OIh/Z7r6eK2OFV3WQLhvecooI/qyQNx69IAfsaJMuKbmZzrYnjMbrMfZh0QfOeDa8vLvyzUL4SdQSmt5WV6wbPHnnAx/2+nkJHmCVzjjsywni56Nt9ViNW3WPBJmwfGc13Jn/7Qhfx1WLHxV1pu1ZRvtT77S4QJi+uosB+zRfJm+2a6jjFrDTUQTCfkfLfSwB8qWgbU2vVjjgD0nJC3HQ1EXHW7Cixi4ba8nlquOcsDuEpKOHa8d3kRPcp8fo5Oa6gfpcMBOdLUJfIue1ybrYcIVcykHa7bskTXGWu6DA3boe7O21muFN6HHC5nFPMvalm26Y+Nrso8t3npUgH8y973sLBUjiPJkshpUW9JWhkzfZnTGHDBbNbN3tjBepl92Sc+rNVsgZjqSxzhoejyAqclem2SzrkETUbfdLTOicnmIU9ClhVuPcVj8WACbQ+csyyUygiob9wufTLiw1Zj1SVhRl50VP74h0yMBnDXOzGed3KGdGSZkMK5ddAJjtrdkRzM2GnGLA2akJc2WEGUGzd2FVG76XjtDZiU3zNHW4/LT/w/W6/g6YkDYzwAAAABJRU5ErkJggg==";
let transparentLogoPromise=null;
const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA']);
const style=document.createElement('style');
style.id='yardon-brand-style-v1';
style.textContent=`
@keyframes yardonBrandPulse{
  0%,100%{opacity:.50;transform:translate3d(-50%,-50%,0) scale(.94)}
  50%{opacity:.92;transform:translate3d(-50%,-50%,0) scale(1.08)}
}
@keyframes yardonLogoBreathe{
  0%,100%{transform:translate3d(0,0,0) scale(1)}
  50%{transform:translate3d(0,0,0) scale(1.012)}
}
@keyframes yardonTextPulse{
  0%,100%{text-shadow:0 0 8px rgba(0,174,255,.20),0 0 20px rgba(0,120,255,.12);}
  50%{text-shadow:0 0 12px rgba(0,215,255,.68),0 0 30px rgba(0,145,255,.48),0 0 54px rgba(0,90,255,.28);}
}
@keyframes yardonBarPulse{
  0%,100%{box-shadow:0 0 8px rgba(0,174,255,.30),0 0 18px rgba(0,120,255,.18);}
  50%{box-shadow:0 0 14px rgba(0,210,255,.70),0 0 30px rgba(0,130,255,.42);}
}


@keyframes yardonLoginZoom{
  0%{opacity:0;transform:scale(.42);filter:drop-shadow(0 0 8px rgba(0,183,255,.28)) drop-shadow(0 0 18px rgba(0,120,255,.18));}
  18%{opacity:1;transform:scale(.72);}
  64%{opacity:1;transform:scale(1.28);filter:drop-shadow(0 0 24px rgba(0,220,255,.88)) drop-shadow(0 0 58px rgba(0,135,255,.58)) drop-shadow(0 0 100px rgba(0,80,255,.32));}
  100%{opacity:0;transform:scale(2.15);filter:drop-shadow(0 0 34px rgba(0,220,255,.22)) drop-shadow(0 0 90px rgba(0,110,255,.12));}
}
#yardonLoginTransition{
  position:fixed!important;
  inset:0!important;
  z-index:2147483646!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  pointer-events:none!important;
  overflow:hidden!important;
  background:radial-gradient(circle at center,rgba(0,83,145,.34) 0%,rgba(0,24,46,.90) 40%,rgba(0,8,17,.99) 100%)!important;
  opacity:1;
}
#yardonLoginTransition img{
  width:min(1120px,88vw)!important;
  max-width:88vw!important;
  height:auto!important;
  display:block!important;
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
  animation:yardonLoginZoom 1s cubic-bezier(.2,.7,.2,1) forwards!important;
  transform-origin:center center!important;
}


#yardivoWelcomeSplash .yardivo-welcome-logo-wrap,
.login-logo-combo,
.yardon-topbar-brand,
.home-menu-brand,
#yardivoSupplierPortal .yardon-supplier-brand{
  position:relative!important;
  isolation:isolate;
}
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap::before,
.login-logo-combo::before{
  content:"";
  position:absolute;
  left:50%;top:50%;
  width:min(760px,82vw);
  aspect-ratio:4.2/1;
  transform:translate3d(-50%,-50%,0);
  border-radius:50%;
  background:radial-gradient(ellipse at center,rgba(0,222,255,.28) 0%,rgba(0,130,255,.15) 42%,rgba(0,70,170,0) 76%);
  filter:none;
  pointer-events:none;
  z-index:-1;
  will-change:transform,opacity;
  animation:yardonBrandPulse 2.4s ease-in-out infinite;
}
.login-logo-combo::before{
  width:min(440px,88vw);
  aspect-ratio:3.8/1;
}

/* YardOn desktop frameless final */
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap,
#yardivoWelcomeSplash .yardon-welcome-logo,
.login-logo-combo,
.login-logo-combo img,
.brand-combo,
.brand-combo img,
.yardon-topbar-brand,
.yardon-topbar-brand img{
  background:transparent!important;
  background-color:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
}
#yardivoWelcomeSplash{
  background:
    radial-gradient(ellipse at 50% 42%,rgba(0,135,220,.22) 0%,rgba(0,76,145,.13) 30%,rgba(2,25,45,0) 62%),
    linear-gradient(180deg,#061827 0%,#03111e 58%,#020c15 100%)!important;
}
#yardivoWelcomeSplash .yardivo-welcome-inner{
  position:relative;
}
#yardivoWelcomeSplash .yardivo-welcome-inner::before{
  content:"";
  position:absolute;
  left:50%;top:36%;
  width:min(980px,84vw);height:min(300px,30vw);
  transform:translate3d(-50%,-50%,0);
  background:radial-gradient(ellipse at center,rgba(0,210,255,.15),rgba(0,112,255,.06) 44%,transparent 72%);
  pointer-events:none;
  z-index:-1;
  animation:yardonBrandPulse 3.2s ease-in-out infinite;
}
.login-overlay{
  background:
    radial-gradient(ellipse at 50% 26%,rgba(0,150,235,.17) 0%,rgba(0,83,155,.08) 36%,rgba(4,18,31,0) 62%),
    #06121e!important;
}
.login-logo-combo{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  width:100%!important;
  padding:0!important;
  margin:0 auto 18px!important;
}
.login-logo-combo::before{
  width:min(560px,76vw)!important;
  opacity:.72;
}
.brand-combo img,.yardon-topbar-brand img{
  object-fit:contain!important;
  object-position:center center!important;
}
#yardivoWelcomeSplash .yardon-split-half{
  background:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  filter:none!important;
}

/* Canonical YardOn transparent logo treatment. */
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap,
.login-logo-combo,
.brand-combo,
.home-menu-brand,
.yardon-topbar-brand,
#yardivoSupplierPortal .yardon-supplier-brand,
.yardon-role-brand,
.yardon-role-brand-wrap,
[data-yardon-brand],
[class*="logo"][data-yardon-runtime-logo="1"]{
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
}

#yardivoWelcomeSplash .yardivo-welcome-inner{
  width:min(1120px,94vw)!important;
  max-width:none!important;
}

#yardivoWelcomeSplash .yardivo-welcome-logo-wrap{
  display:flex!important;
  justify-content:center!important;
  align-items:center!important;
  margin:0 auto 16px!important;
  max-width:none!important;
  width:100%!important;
}

#yardivoWelcomeSplash .yardon-welcome-logo{
  display:block!important;
  width:clamp(620px,60vw,980px)!important;
  max-width:92vw!important;
  max-height:none!important;
  height:auto!important;
  object-fit:contain!important;
  background:transparent!important;
  mix-blend-mode:normal;
  filter:none;
  transform:translate3d(0,0,0);
  will-change:transform,opacity;
  backface-visibility:hidden;
  animation:yardonLogoBreathe 3.4s ease-in-out infinite;
}

#yardivoWelcomeSplash .yardon-welcome-title{
  display:flex!important;
  justify-content:center!important;
  align-items:baseline!important;
  flex-wrap:nowrap!important;
  gap:0!important;
  margin:2px 0 10px!important;
  font-size:clamp(34px,3.2vw,58px)!important;
  line-height:1.08!important;
  letter-spacing:.015em!important;
  white-space:nowrap!important;
  text-transform:uppercase!important;
}

#yardivoWelcomeSplash .yardon-welcome-prefix,
#yardivoWelcomeSplash .yardon-white{
  color:#fff!important;
  font-weight:900!important;
}

#yardivoWelcomeSplash .yardon-welcome-prefix{
  margin-right:.27em!important;
}

#yardivoWelcomeSplash .yardon-blue{
  color:#09b8ff!important;
  font-weight:900!important;
  text-shadow:0 0 10px rgba(0,190,255,.38),0 0 24px rgba(0,120,255,.18);
}

#yardivoWelcomeSplash .yardivo-welcome-sub{
  text-transform:uppercase!important;
  letter-spacing:.20em!important;
  color:rgba(220,235,250,.84)!important;
}

#yardivoWelcomeSplash .yardivo-welcome-progress i{
  width:100%!important;
  transform:scaleX(0);
  transform-origin:left center;
  will-change:transform;
  background:linear-gradient(90deg,#19c8ff 0%,#1676ff 100%)!important;
  box-shadow:0 0 12px rgba(0,190,255,.48);
}

.login-logo-combo{
  display:flex!important;
  justify-content:center!important;
  align-items:center!important;
  margin:-4px auto 24px!important;
  padding:0!important;
  width:100%!important;
  overflow:visible!important;
}

.login-logo-combo img{
  display:block!important;
  width:clamp(310px,31vw,470px)!important;
  max-width:96%!important;
  height:auto!important;
  object-fit:contain!important;
  background:transparent!important;
  mix-blend-mode:normal;
  filter:drop-shadow(0 0 9px rgba(0,190,255,.25));
  animation:yardonLogoBreathe 2.8s ease-in-out infinite;
  will-change:transform;
}

.login-card{
  overflow:visible!important;
}

.yardon-topbar-brand{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  min-width:170px!important;
  max-width:235px!important;
  padding-right:12px!important;
  background:transparent!important;
}

.yardon-topbar-brand img,
.home-menu-brand img,
.studenac-market-logo,
#yardivoSupplierPortal .yardon-supplier-brand img{
  background:transparent!important;
  mix-blend-mode:normal;
  filter:drop-shadow(0 0 7px rgba(0,185,255,.22));
  animation:yardonLogoBreathe 3s ease-in-out infinite;
  will-change:transform;
}

.yardon-topbar-brand img{
  display:block!important;
  width:205px!important;
  max-width:20vw!important;
  height:48px!important;
  object-fit:contain!important;
  object-position:left center!important;
}

.home-menu-brand img{
  display:block!important;
  width:min(520px,76vw)!important;
  max-width:100%!important;
  height:auto!important;
  object-fit:contain!important;
}

.studenac-market-logo{
  display:block!important;
  width:100%!important;
  max-width:260px!important;
  height:auto!important;
  object-fit:contain!important;
}

#yardivoSupplierPortal .yardon-supplier-brand{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  padding:8px 12px!important;
}

#yardivoSupplierPortal .yardon-supplier-brand img,
.yardon-role-brand img,
.yardon-role-brand-wrap img,
img[data-yardon-runtime-logo="1"]{
  width:min(330px,74vw)!important;
  height:auto!important;
  display:block!important;
  object-fit:contain!important;
  background:transparent!important;
  mix-blend-mode:normal;
  filter:drop-shadow(0 0 7px rgba(0,185,255,.22));
  animation:yardonLogoBreathe 3s ease-in-out infinite;
  will-change:transform;
}


@keyframes yardonWelcomeFinalZoom{
  0%{transform:translate3d(0,0,0) scale(1);opacity:1}
  72%{transform:translate3d(0,0,0) scale(2.15);opacity:1}
  100%{transform:translate3d(0,0,0) scale(3.05);opacity:0}
}
@keyframes yardonWelcomeFadeOut{
  to{opacity:0;transform:translate3d(0,10px,0)}
}
#yardivoWelcomeSplash.yardon-final-zoom{
  overflow:hidden!important;
}
#yardivoWelcomeSplash.yardon-final-zoom .yardon-welcome-logo{
  animation:yardonWelcomeFinalZoom 2s cubic-bezier(.18,.72,.16,1) forwards!important;
}
#yardivoWelcomeSplash.yardon-final-zoom .yardon-welcome-title,
#yardivoWelcomeSplash.yardon-final-zoom .yardivo-welcome-sub,
#yardivoWelcomeSplash.yardon-final-zoom .yardivo-welcome-copy,
#yardivoWelcomeSplash.yardon-final-zoom .yardivo-welcome-progress,
#yardivoWelcomeSplash.yardon-final-zoom .yardivo-welcome-meta,
#yardivoWelcomeSplash.yardon-final-zoom .yardivo-welcome-foot{
  animation:yardonWelcomeFadeOut .28s ease forwards!important;
  pointer-events:none;
}


@keyframes yardonSplitLeft{
  0%{transform:translate3d(0,0,0) scale(1.03);opacity:1}
  18%{transform:translate3d(-1vw,0,0) scale(1.08);opacity:1}
  58%{transform:translate3d(-20vw,0,0) scale(1.28);opacity:.96}
  100%{transform:translate3d(-62vw,0,0) scale(1.68);opacity:.04}
}
@keyframes yardonSplitRight{
  0%{transform:translate3d(0,0,0) scale(1.03);opacity:1}
  18%{transform:translate3d(1vw,0,0) scale(1.08);opacity:1}
  58%{transform:translate3d(20vw,0,0) scale(1.28);opacity:.96}
  100%{transform:translate3d(62vw,0,0) scale(1.68);opacity:.04}
}
@keyframes yardonSeamFlash{
  0%{opacity:0;transform:translate3d(-50%,-50%,0) scaleY(.25)}
  30%{opacity:1;transform:translate3d(-50%,-50%,0) scaleY(1)}
  100%{opacity:0;transform:translate3d(-50%,-50%,0) scaleY(1.25)}
}
@keyframes yardonSplashDissolve{
  0%,52%{opacity:1}
  100%{opacity:0}
}
#yardivoWelcomeSplash.yardon-split-reveal{
  perspective:1400px!important;
  overflow:hidden!important;
  background:transparent!important;
}
#yardivoWelcomeSplash.yardon-split-reveal::after{
  content:"";
  position:absolute;inset:0;
  background:rgba(0,12,25,.72);
  pointer-events:none;
  z-index:1;
  opacity:1;
  animation:yardonSplashDissolve 3.15s ease forwards!important;
  will-change:opacity;
}
#yardivoWelcomeSplash.yardon-split-reveal .yardivo-welcome-inner{
  visibility:hidden!important;
}
#yardivoWelcomeSplash .yardon-split-stage{
  position:absolute!important;
  inset:0!important;
  z-index:6!important;
  display:grid!important;
  place-items:center!important;
  pointer-events:none!important;
}
#yardivoWelcomeSplash .yardon-split-stage::before{
  content:"";
  position:absolute;
  left:50%;top:50%;
  width:min(920px,96vw);
  aspect-ratio:4/1;
  transform:translate3d(-50%,-50%,0);
  border-radius:50%;
  background:radial-gradient(ellipse at center,rgba(0,205,255,.38) 0%,rgba(0,118,255,.16) 40%,rgba(0,70,170,0) 74%);
  opacity:.88;
  will-change:opacity,transform;
  animation:yardonBrandPulse 2.6s ease-in-out infinite;
}
#yardivoWelcomeSplash .yardon-split-stage::after{
  content:"";
  position:absolute;
  left:50%;top:50%;
  width:2px;height:min(380px,46vh);
  transform:translate3d(-50%,-50%,0);
  background:linear-gradient(180deg,rgba(0,210,255,0),rgba(105,235,255,.95),rgba(0,150,255,.88),rgba(0,210,255,0));
  box-shadow:0 0 12px rgba(0,220,255,.88),0 0 34px rgba(0,135,255,.62);
  opacity:0;
  will-change:transform,opacity;
  animation:yardonSeamFlash .62s ease-out forwards;
}
#yardivoWelcomeSplash .yardon-split-half{
  position:absolute!important;
  width:clamp(560px,57vw,900px)!important;
  max-width:92vw!important;
  height:auto!important;
  object-fit:contain!important;
  filter:none;
  will-change:transform,opacity;
  backface-visibility:hidden;
}
#yardivoWelcomeSplash .yardon-split-half.left{
  clip-path:inset(0 50% 0 0);
  animation:yardonSplitLeft 3.15s cubic-bezier(.14,.76,.16,1) forwards!important;
}
#yardivoWelcomeSplash .yardon-split-half.right{
  clip-path:inset(0 0 0 50%);
  animation:yardonSplitRight 3.15s cubic-bezier(.14,.76,.16,1) forwards!important;
}
.login-screen.yardon-login-arrive,
.login-overlay.yardon-login-arrive,
#loginScreen.yardon-login-arrive,
#loginOverlay.yardon-login-arrive,
#login.yardon-login-arrive,
[data-login-screen].yardon-login-arrive{
  transform:perspective(1200px) translateZ(-720px) scale(.42)!important;
  opacity:0!important;
  transition:transform 2.65s cubic-bezier(.12,.82,.16,1),opacity 1.35s ease!important;
  will-change:transform,opacity;
  backface-visibility:hidden;
}
.login-screen.yardon-login-arrive.yardon-login-arrive-active,
.login-overlay.yardon-login-arrive.yardon-login-arrive-active,
#loginScreen.yardon-login-arrive.yardon-login-arrive-active,
#loginOverlay.yardon-login-arrive.yardon-login-arrive-active,
#login.yardon-login-arrive.yardon-login-arrive-active,
[data-login-screen].yardon-login-arrive.yardon-login-arrive-active{
  transform:perspective(1200px) translateZ(0) scale(1)!important;
  opacity:1!important;
}

@media(max-width:700px){
  #yardivoWelcomeSplash .yardon-welcome-logo{width:min(92vw,610px)!important;}
  #yardivoWelcomeSplash .yardon-welcome-title{font-size:clamp(26px,7.4vw,42px)!important;}
  .login-logo-combo img{width:min(88vw,390px)!important;}
  .yardon-topbar-brand{min-width:104px!important;max-width:132px!important;}
  .yardon-topbar-brand img{width:122px!important;max-width:30vw!important;height:38px!important;}
}
`
document.head.appendChild(style);

function brandText(v){
  return String(v??'')
    .replace(/YARDIVO DEV V5\.8\.3/gi,BRAND+' '+VERSION)
    .replace(/YARDIVO DEV/gi,BRAND+' '+VERSION)
    .replace(/YARDIVO™/g,BRAND+'™')
    .replace(/YARDIVO/g,BRAND)
    .replace(/Yardivo/g,BRAND)
    .replace(/\bV5\.8\.3\b/gi,VERSION);
}
function transparentLogo(){
  window.__yardonTransparentLogo=LOGO;
  return Promise.resolve(LOGO);
}
function prepareLogo(el){
  if(!(el instanceof HTMLImageElement))return;
  el.src=LOGO;
  el.dataset.yardonPrepared='1';
  el.dataset.yardonRuntimeLogo='1';
  el.style.setProperty('display','block','important');
  el.style.setProperty('visibility','visible','important');
  el.style.setProperty('opacity','1','important');
  el.style.setProperty('background','transparent','important');
  el.style.setProperty('border','0','important');
  el.style.setProperty('outline','0','important');
  el.style.setProperty('box-shadow','none','important');
  el.style.setProperty('filter','none','important');
  el.style.setProperty('mix-blend-mode','normal','important');
}
function patchElement(el){
  if(!(el instanceof Element))return;
  if(el.tagName==='IMG'){
    const src=el.getAttribute('src')||'';
    if(/assets\/yardivo-logo\.svg(?:\?.*)?$/i.test(src))el.setAttribute('src',LOGO);
    const now=el.getAttribute('src')||'';
    if(/yardon-logo(?:-transparent(?:-v\d+)?)?\.(?:webp|png|svg)(?:\?.*)?$/i.test(now)||el.dataset.yardonPrepared==='1'){
      prepareLogo(el);
      el.setAttribute('data-yardon-runtime-logo','1');
      el.style.setProperty('background','transparent','important');
      el.style.setProperty('box-shadow','none','important');
      el.style.setProperty('mix-blend-mode','normal','important');
      const host=el.closest('.brand-combo,.home-menu-brand,.yardon-topbar-brand,.login-logo-combo,.yardivo-welcome-logo-wrap,.ysp-head,.ysp-header,.ysp-top,.ysp-nav,.sidebar,.topbar,[class*="brand"],[class*="logo"]');
      if(host){
        host.classList.add('yardon-role-brand-wrap');
        host.style.setProperty('background','transparent','important');
        host.style.setProperty('box-shadow','none','important');
      }
    }
  }
  for(const a of ['alt','aria-label','title','placeholder']){
    if(el.hasAttribute?.(a)){
      const old=el.getAttribute(a),next=brandText(old);
      if(next!==old)el.setAttribute(a,next);
    }
  }
}
function patchTree(root=document){
  if(root instanceof Element)patchElement(root);
  const scope=root?.querySelectorAll?root:document;
  scope.querySelectorAll?.('*').forEach(patchElement);
  const walker=document.createTreeWalker(root===document?document.documentElement:root,NodeFilter.SHOW_TEXT);
  let n;
  while((n=walker.nextNode())){
    if(SKIP.has(n.parentElement?.tagName))continue;
    const old=n.nodeValue||'',next=brandText(old);
    if(next!==old)n.nodeValue=next;
  }
  document.title=BRAND+' '+VERSION+' - Yard Management System';
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content',BRAND);
  document.querySelector('meta[name="application-name"]')?.setAttribute('content',BRAND);
}
function ensureBrandLogos(){
  document.querySelectorAll('img[src*="yardon-logo"]').forEach(patchElement);
  const splash=document.getElementById('yardivoWelcomeSplash');
  if(splash&&!splash.querySelector('.yardon-welcome-logo')){
    const old=splash.querySelector('.yardivo-welcome-mark');
    const wrap=document.createElement('div');wrap.className='yardivo-welcome-logo-wrap';
    wrap.innerHTML='<img class="yardon-welcome-logo" src="'+LOGO+'" alt="YardOn Yard Management System">';
    old?.replaceWith(wrap);
  }
  const top=document.querySelector('header.topbar');
  if(top&&!top.querySelector('.yardon-topbar-brand')){
    const d=document.createElement('div');d.className='yardon-topbar-brand';d.setAttribute('aria-label','YardOn');
    d.innerHTML='<img src="'+LOGO+'" alt="YardOn">';
    top.prepend(d);
  }
  document.querySelectorAll('.sidebar,.topbar,#homeMenu,[data-role],[data-yardivo-role]').forEach(root=>{
    root.querySelectorAll?.('img[src*="yardon-logo"]').forEach(img=>{
      img.setAttribute('data-yardon-runtime-logo','1');
      img.closest('.brand-combo,.home-menu-brand,.yardon-topbar-brand,[class*="brand"],[class*="logo"]')?.classList.add('yardon-role-brand-wrap');
    });
  });
  const sp=document.getElementById('yardivoSupplierPortal');
  if(sp&&!sp.querySelector('.yardon-supplier-brand')){
    const target=sp.querySelector('.ysp-head,.ysp-header,.ysp-top,.ysp-nav')||sp.firstElementChild;
    if(target){
      const d=document.createElement('div');d.className='yardon-supplier-brand';
      d.innerHTML='<img src="'+LOGO+'" alt="YardOn">';
      target.prepend(d);
    }
  }
}
function apply(){try{patchTree(document);ensureBrandLogos()}catch(e){console.warn('YardOn brand runtime',e)}}
const nativeAlert=window.alert?.bind(window),nativeConfirm=window.confirm?.bind(window),nativePrompt=window.prompt?.bind(window);
if(nativeAlert)window.alert=(message)=>nativeAlert(brandText(message));
if(nativeConfirm)window.confirm=(message)=>nativeConfirm(brandText(message));
if(nativePrompt)window.prompt=(message,defaultValue)=>nativePrompt(brandText(message),defaultValue);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
new MutationObserver(ms=>{
  for(const m of ms){
    if(m.type==='characterData'&&m.target?.parentElement&&!SKIP.has(m.target.parentElement.tagName)){
      const old=m.target.nodeValue||'',next=brandText(old);if(next!==old)m.target.nodeValue=next;
    }
    for(const n of m.addedNodes)if(n.nodeType===1)patchTree(n);else if(n.nodeType===3){const old=n.nodeValue||'',next=brandText(old);if(next!==old)n.nodeValue=next} ensureBrandLogos();
  }
}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});

function runLoginTransition(){
  try{
    document.getElementById('yardonLoginTransition')?.remove();
    const overlay=document.createElement('div');
    overlay.id='yardonLoginTransition';
    overlay.setAttribute('aria-hidden','true');
    const img=document.createElement('img');img.alt='';
    img.src=window.__yardonTransparentLogo||LOGO;
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    if(!window.__yardonTransparentLogo)prepareLogo(img);
    setTimeout(()=>overlay.remove(),1050);
  }catch(e){console.warn('YardOn login transition',e)}
}
window.addEventListener('yardivo:login',runLoginTransition);

window.YardOnBrand={name:BRAND,version:VERSION,logo:LOGO,apply,runLoginTransition,transparentLogo};
window.YARDIVO_PRODUCT_NAME=BRAND;
window.YARDIVO_PRODUCT_VERSION=VERSION;
})();