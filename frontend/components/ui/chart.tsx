'use client'

import * as React from 'react'
import * as RechartsPrimitives from 'recharts'
import { cn } from '@/lib/utils'

// Chart Container
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: Record<string, { label?: React.ReactNode; color?: string }>
    children: React.ComponentProps<typeof RechartsPrimitives.ResponsiveContainer>['children']
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <div
      data-chart={chartId}
      ref={ref}
      className={cn('flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke="#ccc"]]:stroke-border/50', className)}
      {...props}
    >
      <ChartStyle id={chartId} config={config} />
      <RechartsPrimitives.ResponsiveContainer>
        {children}
      </RechartsPrimitives.ResponsiveContainer>
    </div>
  )
})
ChartContainer.displayName = 'Chart'

const ChartStyle = ({ id, config }: { id: string; config: Record<string, { color?: string }> }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.color)

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(config)
          .filter(([_, config]) => config.color)
          .map(([key, itemConfig]) => {
            const color = itemConfig.color
            return [
              `.${id} [data-${key}="true"] {`,
              `  color: ${color};`,
              `  fill: ${color};`,
              `}`,
            ].join('\n')
          })
          .join('\n'),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitives.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    active?: boolean
    payload?: Array<{
      name?: string
      value?: any
      dataKey?: string
      color?: string
      payload?: any
    }>
    label?: any
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: 'line' | 'dot' | 'dashed'
    nameKey?: string
    labelKey?: string
    labelFormatter?: (label: any, payload: any) => React.ReactNode
    formatter?: (value: any, name: any, item: any, index: number, payload: any) => React.ReactNode
    color?: string
    labelClassName?: string
  }
>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || item.name || 'value'}`
      const itemConfig = item.payload?.config?.[key] || {}

      if (labelFormatter) {
        return (
          <div className={cn('font-medium', labelClassName)}>
            {labelFormatter(label, payload)}
          </div>
        )
      }

      if (!labelFormatter && typeof label === 'string') {
        return <div className={cn('font-medium', labelClassName)}>{label}</div>
      }

      if (!labelFormatter && label) {
        return <div className={cn('font-medium', labelClassName)}>{label}</div>
      }

      return null
    }, [label, labelFormatter, payload, hideLabel, labelClassName, labelKey])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== 'dot'

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-white/10 bg-gray-900/95 px-2.5 py-1.5 text-xs shadow-xl',
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className={cn('grid gap-1.5', nestLabel ? 'gap-2' : '')}>
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`
            const itemConfig = item.payload?.config?.[key] || {}
            const indicatorColor = color || item.payload.fill || item.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                  nestLabel ? 'items-center' : 'items-start',
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {!hideIndicator ? (
                      <div
                        className={cn(
                          'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                          {
                            'h-2.5 w-2.5': indicator === 'dot',
                            'w-1': indicator === 'line',
                            'w-0 border-[1.5px] border-dashed bg-transparent':
                              indicator === 'dashed',
                            'my-0.5': nestLabel && indicator === 'dashed',
                          },
                        )}
                        style={
                          {
                            '--color-bg': indicatorColor,
                            '--color-border': indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    ) : null}
                    <div
                      className={cn(
                        'flex flex-1 justify-between leading-none',
                        nestLabel ? 'items-center' : 'items-start',
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className="font-mono font-medium tabular-nums text-white ml-4">
                          {typeof item.value === 'number'
                            ? item.value.toLocaleString('pt-BR')
                            : item.value}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)
ChartTooltipContent.displayName = 'ChartTooltip'

const ChartLegend = RechartsPrimitives.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    payload?: Array<{
      value?: any
      dataKey?: string
      color?: string
      payload?: any
    }>
    verticalAlign?: 'top' | 'bottom'
    hideIcon?: boolean
    nameKey?: string
  }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey },
    ref,
  ) => {
    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center gap-4',
          verticalAlign === 'top' ? 'pb-3' : 'pt-3',
          className,
        )}
      >
        {payload.map((item, index) => {
          const key = `${nameKey || item.dataKey || 'value'}`
          const itemConfig = item.payload?.config?.[key] || {}

          return (
            <div
              key={index}
              className={cn(
                'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground',
              )}
            >
              {!hideIcon && (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color || '#9CA3AF',
                  }}
                />
              )}
              <span className="text-muted-foreground">
                {itemConfig?.label || item.value}
              </span>
            </div>
          )
        })}
      </div>
    )
  },
)
ChartLegendContent.displayName = 'ChartLegendContent'

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}

