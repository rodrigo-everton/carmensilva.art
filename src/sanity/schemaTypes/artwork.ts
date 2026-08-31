import {defineField, defineType} from 'sanity'

export const artworkType = defineType({
  name: 'artwork',
  title: 'Obra',
  type: 'document',

  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'year',
      title: 'Ano',
      type: 'number',
    }),

    defineField({
      name: 'description',
      title: 'Descrição',
      type: 'text',
      rows: 5,
    }),

    defineField({
      name: 'technique',
      title: 'Técnica',
      type: 'string',
    }),

    defineField({
      name: 'dimensions',
      title: 'Dimensões',
      type: 'object',

      fields: [
        defineField({
          name: 'width',
          title: 'Largura',
          type: 'number',
        }),

        defineField({
          name: 'height',
          title: 'Altura',
          type: 'number',
        }),

        defineField({
          name: 'depth',
          title: 'Profundidade',
          type: 'number',
        }),

        defineField({
          name: 'unit',
          title: 'Unidade',
          type: 'string',
          initialValue: 'cm',
          options: {
            list: [
              {
                title: 'Centímetros',
                value: 'cm',
              },
            ],
          },
        }),
      ],
    }),

    defineField({
      name: 'mainImage',
      title: 'Imagem principal',
      type: 'image',

      options: {
        hotspot: true,
      },

      fields: [
        defineField({
          name: 'alt',
          title: 'Texto alternativo',
          type: 'string',
        }),
      ],

      validation: (rule) => rule.required().assetRequired(),
    }),

    defineField({
      name: 'images',
      title: 'Galeria',
      type: 'array',

      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },

          fields: [
            defineField({
              name: 'alt',
              title: 'Texto alternativo',
              type: 'string',
            }),
          ],
        },
      ],
    }),

    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',

      options: {
        list: [
          {
            title: 'Disponível',
            value: 'available',
          },
          {
            title: 'Reservada',
            value: 'reserved',
          },
          {
            title: 'Vendida',
            value: 'sold',
          },
          {
            title: 'Em exposição',
            value: 'exhibition',
          },
        ],
        layout: 'radio',
      },

      initialValue: 'available',

      readOnly: ({document}) => {
        const commerce = document?.commerce as {saleId?: unknown} | undefined
        return typeof commerce?.saleId === 'string'
      },

      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'commerce',
      title: 'Controle automático de pagamento',
      type: 'object',
      description:
        'Metadados mantidos automaticamente pelo fluxo de venda. Não edite manualmente.',
      readOnly: true,
      hidden: ({value}) => value === undefined,
      options: {
        collapsible: true,
        collapsed: true,
      },
      fields: [
        defineField({
          name: 'saleId',
          title: 'ID da venda',
          type: 'string',
        }),
        defineField({
          name: 'paymentPreferenceId',
          title: 'ID da preferência',
          type: 'string',
        }),
        defineField({
          name: 'providerPaymentId',
          title: 'ID do pagamento no provedor',
          type: 'string',
        }),
        defineField({
          name: 'reservationExpiresAt',
          title: 'Reserva válida até',
          type: 'datetime',
        }),
        defineField({
          name: 'updatedAt',
          title: 'Última sincronização',
          type: 'datetime',
        }),
      ],
    }),

    defineField({
      name: 'salePosition',
      title: 'Posição na venda',
      type: 'number',
      description:
        'Quanto menor o número, antes a obra aparece em /venda. Ex.: 1 coloca a obra na primeira posição.',
      hidden: ({document}) =>
        document?.status !== 'available' && document?.status !== 'reserved',
      validation: (rule) =>
        rule
          .integer()
          .min(1)
          .custom((value, context) => {
            const status = context.document?.status
            const isForSale = status === 'available' || status === 'reserved'

            if (isForSale && typeof value !== 'number') {
              return 'Informe a posição da obra na página de venda.'
            }

            return true
          }),
    }),

    defineField({
      name: 'featured',
      title: 'Obra em destaque',
      type: 'boolean',
      initialValue: false,
    }),

    defineField({
      name: 'catalogNumber',
      title: 'Número de catálogo',
      type: 'string',
      description: 'Identificador interno da obra. Ex.: CS-2026-014',
    }),
  ],

  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
      year: 'year',
      status: 'status',
    },

    prepare({title, media, year, status}) {
      const statusLabels: Record<string, string> = {
        available: 'Disponível',
        reserved: 'Reservada',
        sold: 'Vendida',
        exhibition: 'Em exposição',
      }

      return {
        title,
        media,
        subtitle: [
          year,
          status ? statusLabels[status] : undefined,
        ]
          .filter(Boolean)
          .join(' • '),
      }
    },
  },
})
